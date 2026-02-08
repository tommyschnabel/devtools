/**
 * SAML decoding utilities
 * Decodes SAML Requests/Responses from Base64 (+ optional deflate) back to readable XML.
 * Zero external dependencies — uses atob(), DecompressionStream, DOMParser.
 */

import { prettifyXml } from './xml';

// SAML 2.0 Namespaces
const NS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion';
const NS_SAMLP = 'urn:oasis:names:tc:SAML:2.0:protocol';

export interface SamlField {
  label: string;
  value: string;
  status?: 'valid' | 'expired' | 'not-yet-valid' | 'info';
}

export interface DecodedSaml {
  xml: string;
  prettyXml: string;
  type: 'Response' | 'Request' | 'LogoutRequest' | 'LogoutResponse' | 'Unknown';
  fields: SamlField[];
  attributes: { name: string; values: string[] }[];
}

function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function base64Decode(input: string): Uint8Array {
  // Clean up: remove whitespace/newlines
  const cleaned = input.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function inflate(data: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writerDone = writer.write(data as unknown as BufferSource)
    .then(() => writer.close());

  const chunks: Uint8Array[] = [];
  const [readResult] = await Promise.allSettled([
    (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    })(),
    writerDone,
  ]);

  if (readResult.status === 'rejected') {
    throw new Error('Inflate failed');
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(result);
}

function looksLikeXml(str: string): boolean {
  const trimmed = str.trimStart();
  return trimmed.startsWith('<') && (trimmed.includes('saml') || trimmed.includes('SAML') || trimmed.includes('xmlns'));
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function getTextContent(doc: Document, ns: string, localName: string): string | null {
  const elements = doc.getElementsByTagNameNS(ns, localName);
  if (elements.length > 0) {
    return elements[0]!.textContent?.trim() || null;
  }
  return null;
}

function getAttribute(doc: Document, ns: string, localName: string, attr: string): string | null {
  const elements = doc.getElementsByTagNameNS(ns, localName);
  if (elements.length > 0) {
    return elements[0]!.getAttribute(attr);
  }
  return null;
}

function detectType(doc: Document): DecodedSaml['type'] {
  const root = doc.documentElement;
  if (!root) return 'Unknown';
  const localName = root.localName;
  if (localName === 'Response') return 'Response';
  if (localName === 'AuthnRequest') return 'Request';
  if (localName === 'LogoutRequest') return 'LogoutRequest';
  if (localName === 'LogoutResponse') return 'LogoutResponse';
  return 'Unknown';
}

function checkTimestamp(label: string, value: string | null): SamlField | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { label, value, status: 'info' };
  }
  const now = new Date();
  if (date < now && (label.toLowerCase().includes('not on or after') || label.toLowerCase().includes('session not on or after'))) {
    return { label, value: `${value} (${date.toLocaleString()})`, status: 'expired' };
  }
  if (date > now && label.toLowerCase().includes('not before')) {
    // NotBefore is in the future — not yet valid
    return { label, value: `${value} (${date.toLocaleString()})`, status: 'not-yet-valid' };
  }
  return { label, value: `${value} (${date.toLocaleString()})`, status: 'valid' };
}

function extractFields(doc: Document): { fields: SamlField[]; attributes: { name: string; values: string[] }[] } {
  const fields: SamlField[] = [];
  const attributes: { name: string; values: string[] }[] = [];

  // Root element attributes
  const root = doc.documentElement;
  if (root) {
    const id = root.getAttribute('ID');
    if (id) fields.push({ label: 'ID', value: id, status: 'info' });

    const version = root.getAttribute('Version');
    if (version) fields.push({ label: 'Version', value: version, status: 'info' });

    const issueInstant = root.getAttribute('IssueInstant');
    if (issueInstant) {
      const ts = checkTimestamp('Issue Instant', issueInstant);
      if (ts) fields.push(ts);
    }

    const destination = root.getAttribute('Destination');
    if (destination) fields.push({ label: 'Destination', value: destination, status: 'info' });

    const inResponseTo = root.getAttribute('InResponseTo');
    if (inResponseTo) fields.push({ label: 'InResponseTo', value: inResponseTo, status: 'info' });
  }

  // Issuer
  const issuer = getTextContent(doc, NS_SAML, 'Issuer');
  if (issuer) fields.push({ label: 'Issuer', value: issuer, status: 'info' });

  // Status
  const statusCode = getAttribute(doc, NS_SAMLP, 'StatusCode', 'Value');
  if (statusCode) {
    const shortCode = statusCode.split(':').pop() || statusCode;
    fields.push({
      label: 'Status',
      value: `${shortCode} (${statusCode})`,
      status: shortCode === 'Success' ? 'valid' : 'expired',
    });
  }

  // NameID
  const nameId = getTextContent(doc, NS_SAML, 'NameID');
  if (nameId) {
    const format = getAttribute(doc, NS_SAML, 'NameID', 'Format');
    const formatShort = format ? format.split(':').pop() : '';
    fields.push({
      label: 'NameID',
      value: formatShort ? `${nameId} (${formatShort})` : nameId,
      status: 'info',
    });
  }

  // Conditions
  const conditions = doc.getElementsByTagNameNS(NS_SAML, 'Conditions');
  if (conditions.length > 0) {
    const cond = conditions[0]!;
    const notBefore = cond.getAttribute('NotBefore');
    const notOnOrAfter = cond.getAttribute('NotOnOrAfter');
    if (notBefore) {
      const ts = checkTimestamp('Conditions NotBefore', notBefore);
      if (ts) fields.push(ts);
    }
    if (notOnOrAfter) {
      const ts = checkTimestamp('Conditions Not On Or After', notOnOrAfter);
      if (ts) fields.push(ts);
    }

    // Audience
    const audience = getTextContent(doc, NS_SAML, 'Audience');
    if (audience) fields.push({ label: 'Audience', value: audience, status: 'info' });
  }

  // SessionNotOnOrAfter
  const authnStatements = doc.getElementsByTagNameNS(NS_SAML, 'AuthnStatement');
  if (authnStatements.length > 0) {
    const stmt = authnStatements[0]!;
    const sessionNotOnOrAfter = stmt.getAttribute('SessionNotOnOrAfter');
    if (sessionNotOnOrAfter) {
      const ts = checkTimestamp('Session Not On Or After', sessionNotOnOrAfter);
      if (ts) fields.push(ts);
    }
    const sessionIndex = stmt.getAttribute('SessionIndex');
    if (sessionIndex) fields.push({ label: 'Session Index', value: sessionIndex, status: 'info' });
  }

  // AuthnContext
  const authnContextClassRef = getTextContent(doc, NS_SAML, 'AuthnContextClassRef');
  if (authnContextClassRef) {
    const shortRef = authnContextClassRef.split(':').pop() || authnContextClassRef;
    fields.push({ label: 'AuthnContext', value: shortRef, status: 'info' });
  }

  // Attributes
  const attrElements = doc.getElementsByTagNameNS(NS_SAML, 'Attribute');
  for (let i = 0; i < attrElements.length; i++) {
    const attr = attrElements[i]!;
    const name = attr.getAttribute('Name') || attr.getAttribute('FriendlyName') || 'Unknown';
    const valueElements = attr.getElementsByTagNameNS(NS_SAML, 'AttributeValue');
    const values: string[] = [];
    for (let j = 0; j < valueElements.length; j++) {
      values.push(valueElements[j]!.textContent?.trim() || '');
    }
    attributes.push({ name, values });
  }

  return { fields, attributes };
}

export async function decodeSaml(
  input: string
): Promise<{ success: boolean; data?: DecodedSaml; error?: string }> {
  try {
    if (!input.trim()) {
      return { success: false, error: 'Input is empty' };
    }

    // Step 1: URL decode
    let decoded = urlDecode(input.trim());

    // Step 2: Try Base64 decode
    let bytes: Uint8Array;
    try {
      bytes = base64Decode(decoded);
    } catch {
      return { success: false, error: 'Invalid Base64 encoding. Make sure to paste the raw Base64 SAML data.' };
    }

    // Step 3: Try plain Base64 first; only attempt inflate if it doesn't look like XML.
    // This avoids feeding non-deflated data into DecompressionStream, which throws
    // an unhandled internal TypeError in some runtimes.
    let xmlString: string;
    const plainText = bytesToString(bytes);
    if (looksLikeXml(plainText)) {
      xmlString = plainText;
    } else {
      // Likely deflate-compressed (HTTP-Redirect binding) — inflate
      try {
        xmlString = await inflate(bytes);
      } catch {
        // Last resort: use the plain text and let XML parsing decide
        xmlString = plainText;
      }
    }

    // Step 4: Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'Failed to parse decoded XML. The input may not be valid SAML data.\n\n' + (parseError.textContent || ''),
      };
    }

    // Step 5: Pretty print
    const prettyResult = prettifyXml(xmlString);
    const prettyXml = prettyResult.success && prettyResult.output ? prettyResult.output : xmlString;

    // Step 6: Extract fields
    const type = detectType(doc);
    const { fields, attributes } = extractFields(doc);

    return {
      success: true,
      data: {
        xml: xmlString,
        prettyXml,
        type,
        fields,
        attributes,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode SAML data',
    };
  }
}

// Sample SAML Response (Base64 encoded)
export const SAMPLE_SAML_RESPONSE = btoa(`<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_response_123456" Version="2.0" IssueInstant="2025-01-15T10:30:00Z" Destination="https://sp.example.com/acs" InResponseTo="_request_abc123">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0" ID="_assertion_789" IssueInstant="2025-01-15T10:30:00Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="2025-01-15T10:35:00Z" Recipient="https://sp.example.com/acs" InResponseTo="_request_abc123"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2025-01-15T10:25:00Z" NotOnOrAfter="2025-01-15T10:35:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2025-01-15T10:30:00Z" SessionNotOnOrAfter="2025-01-15T18:30:00Z" SessionIndex="_session_xyz">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">user@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">John</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">Doe</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xsi:type="xs:string">admins</saml:AttributeValue>
        <saml:AttributeValue xsi:type="xs:string">developers</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`);

// Sample SAML AuthnRequest (Base64 encoded, not deflated for simplicity)
export const SAMPLE_SAML_REQUEST = btoa(`<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_request_abc123" Version="2.0" IssueInstant="2025-01-15T10:29:00Z" Destination="https://idp.example.com/sso" AssertionConsumerServiceURL="https://sp.example.com/acs" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>https://sp.example.com</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`);
