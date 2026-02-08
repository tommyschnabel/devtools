/**
 * SAML Assertion Builder utility.
 * Generates SAML assertions, AuthnRequests, and LogoutRequests from form fields.
 * Zero external dependencies.
 */

export type SamlTemplate = 'Response' | 'AuthnRequest' | 'LogoutRequest';

export interface SamlAttribute {
  name: string;
  value: string;
}

export interface SamlBuilderInput {
  template: SamlTemplate;
  issuer: string;
  nameId: string;
  nameIdFormat: string;
  audience: string;
  destination: string;
  acsUrl: string;
  notBeforeMinutes: number;
  validityMinutes: number;
  sessionMinutes: number;
  attributes: SamlAttribute[];
  authnContext: string;
  inResponseTo: string;
}

export type OutputFormat = 'xml' | 'base64' | 'base64-deflate';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateId(): string {
  return '_' + crypto.randomUUID().replace(/-/g, '');
}

function formatISODate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildResponse(input: SamlBuilderInput): string {
  const now = new Date();
  const notBefore = new Date(now.getTime() - input.notBeforeMinutes * 60 * 1000);
  const notOnOrAfter = new Date(now.getTime() + input.validityMinutes * 60 * 1000);
  const sessionNotOnOrAfter = new Date(now.getTime() + input.sessionMinutes * 60 * 1000);
  const responseId = generateId();
  const assertionId = generateId();

  let attributeStatements = '';
  if (input.attributes.length > 0) {
    const attrs = input.attributes
      .filter(a => a.name.trim())
      .map(
        a =>
          `      <saml:Attribute Name="${escapeXml(a.name)}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">${escapeXml(a.value)}</saml:AttributeValue>
      </saml:Attribute>`
      )
      .join('\n');
    attributeStatements = `    <saml:AttributeStatement>\n${attrs}\n    </saml:AttributeStatement>`;
  }

  return `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${formatISODate(now)}" Destination="${escapeXml(input.destination || input.acsUrl)}"${input.inResponseTo ? ` InResponseTo="${escapeXml(input.inResponseTo)}"` : ''}>
  <saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0" ID="${assertionId}" IssueInstant="${formatISODate(now)}">
    <saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="${escapeXml(input.nameIdFormat)}">${escapeXml(input.nameId)}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${formatISODate(notOnOrAfter)}" Recipient="${escapeXml(input.acsUrl)}"${input.inResponseTo ? ` InResponseTo="${escapeXml(input.inResponseTo)}"` : ''}/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${formatISODate(notBefore)}" NotOnOrAfter="${formatISODate(notOnOrAfter)}">
      <saml:AudienceRestriction>
        <saml:Audience>${escapeXml(input.audience)}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${formatISODate(now)}" SessionNotOnOrAfter="${formatISODate(sessionNotOnOrAfter)}" SessionIndex="${generateId()}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>${escapeXml(input.authnContext)}</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
${attributeStatements}
  </saml:Assertion>
</samlp:Response>`;
}

function buildAuthnRequest(input: SamlBuilderInput): string {
  const now = new Date();
  const requestId = generateId();

  return `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${requestId}" Version="2.0" IssueInstant="${formatISODate(now)}" Destination="${escapeXml(input.destination)}" AssertionConsumerServiceURL="${escapeXml(input.acsUrl)}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer>
  <samlp:NameIDPolicy Format="${escapeXml(input.nameIdFormat)}" AllowCreate="true"/>
</samlp:AuthnRequest>`;
}

function buildLogoutRequest(input: SamlBuilderInput): string {
  const now = new Date();
  const requestId = generateId();
  const notOnOrAfter = new Date(now.getTime() + input.validityMinutes * 60 * 1000);

  return `<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${requestId}" Version="2.0" IssueInstant="${formatISODate(now)}" Destination="${escapeXml(input.destination)}" NotOnOrAfter="${formatISODate(notOnOrAfter)}">
  <saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer>
  <saml:NameID Format="${escapeXml(input.nameIdFormat)}">${escapeXml(input.nameId)}</saml:NameID>
</samlp:LogoutRequest>`;
}

export function buildSamlXml(input: SamlBuilderInput): string {
  switch (input.template) {
    case 'Response':
      return buildResponse(input);
    case 'AuthnRequest':
      return buildAuthnRequest(input);
    case 'LogoutRequest':
      return buildLogoutRequest(input);
    default:
      return buildResponse(input);
  }
}

export function toBase64(xml: string): string {
  return btoa(unescape(encodeURIComponent(xml)));
}

export async function toBase64Deflate(xml: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(xml);

  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();

  const writerDone = writer.write(data as unknown as BufferSource)
    .then(() => writer.close());

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  await writerDone;

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return btoa(String.fromCharCode(...result));
}

export function getDefaultInput(): SamlBuilderInput {
  return {
    template: 'Response',
    issuer: 'https://idp.example.com',
    nameId: 'user@example.com',
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    audience: 'https://sp.example.com',
    destination: 'https://sp.example.com/acs',
    acsUrl: 'https://sp.example.com/acs',
    notBeforeMinutes: 5,
    validityMinutes: 5,
    sessionMinutes: 480,
    attributes: [
      { name: 'email', value: 'user@example.com' },
      { name: 'firstName', value: 'John' },
      { name: 'lastName', value: 'Doe' },
    ],
    authnContext: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
    inResponseTo: '_request_abc123',
  };
}
