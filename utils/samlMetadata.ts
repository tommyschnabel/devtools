/**
 * SAML Metadata XML parser.
 * Extracts IdP/SP configuration, endpoints, certificates, and NameID formats.
 * Zero external dependencies.
 */

import { parseX509, pemToDer, derToPem, extractBase64Certificates, type X509Certificate } from './x509';

const NS_MD = 'urn:oasis:names:tc:SAML:2.0:metadata';
const NS_DS = 'http://www.w3.org/2000/09/xmldsig#';

export interface MetadataEndpoint {
  type: 'SSO' | 'SLO' | 'ACS' | 'ArtifactResolution';
  binding: string;
  location: string;
  responseLocation?: string;
  index?: number;
  isDefault?: boolean;
}

export interface MetadataOrganization {
  name?: string;
  displayName?: string;
  url?: string;
}

export interface ParsedMetadata {
  entityId: string;
  type: 'IdP' | 'SP' | 'Both';
  endpoints: MetadataEndpoint[];
  certificates: X509Certificate[];
  nameIdFormats: string[];
  organization?: MetadataOrganization;
  requestedAttributes: { name: string; friendlyName?: string; required: boolean }[];
  wantAuthnRequestsSigned: boolean;
  authnRequestsSigned: boolean;
}

const BINDING_LABELS: Record<string, string> = {
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect': 'HTTP-Redirect',
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST': 'HTTP-POST',
  'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact': 'HTTP-Artifact',
  'urn:oasis:names:tc:SAML:2.0:bindings:SOAP': 'SOAP',
  'urn:oasis:names:tc:SAML:2.0:bindings:PAOS': 'PAOS',
};

export const NAMEID_LABELS: Record<string, string> = {
  'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified': 'Unspecified',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress': 'Email Address',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:transient': 'Transient',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent': 'Persistent',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:entity': 'Entity',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:encrypted': 'Encrypted',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName': 'X.509 Subject Name',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName': 'Windows Domain',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos': 'Kerberos',
};

export function getBindingLabel(binding: string): string {
  return BINDING_LABELS[binding] || binding.split(':').pop() || binding;
}

export function getNameIdLabel(format: string): string {
  return NAMEID_LABELS[format] || format.split(':').pop() || format;
}

function getElements(parent: Element | Document, ns: string, localName: string): Element[] {
  const result: Element[] = [];
  const elements = parent.getElementsByTagNameNS(ns, localName);
  for (let i = 0; i < elements.length; i++) {
    result.push(elements[i]!);
  }
  return result;
}

export async function parseMetadata(
  xmlString: string
): Promise<{ success: boolean; data?: ParsedMetadata; error?: string }> {
  try {
    if (!xmlString.trim()) {
      return { success: false, error: 'Input is empty' };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'Invalid XML: ' + (parseError.textContent || 'Parse error'),
      };
    }

    // Entity ID
    const entityDescriptors = getElements(doc, NS_MD, 'EntityDescriptor');
    if (entityDescriptors.length === 0) {
      return { success: false, error: 'No EntityDescriptor found. This does not appear to be SAML metadata.' };
    }
    const entityDescriptor = entityDescriptors[0]!;
    const entityId = entityDescriptor.getAttribute('entityID') || '';

    // Determine type
    const idpDescriptors = getElements(entityDescriptor, NS_MD, 'IDPSSODescriptor');
    const spDescriptors = getElements(entityDescriptor, NS_MD, 'SPSSODescriptor');
    const hasIdP = idpDescriptors.length > 0;
    const hasSP = spDescriptors.length > 0;
    const type: ParsedMetadata['type'] = hasIdP && hasSP ? 'Both' : hasIdP ? 'IdP' : 'SP';

    // Signing flags
    let wantAuthnRequestsSigned = false;
    let authnRequestsSigned = false;
    if (hasIdP) {
      wantAuthnRequestsSigned = idpDescriptors[0]!.getAttribute('WantAuthnRequestsSigned') === 'true';
    }
    if (hasSP) {
      authnRequestsSigned = spDescriptors[0]!.getAttribute('AuthnRequestsSigned') === 'true';
    }

    // Endpoints
    const endpoints: MetadataEndpoint[] = [];

    // IdP endpoints
    for (const idp of idpDescriptors) {
      for (const sso of getElements(idp, NS_MD, 'SingleSignOnService')) {
        endpoints.push({
          type: 'SSO',
          binding: getBindingLabel(sso.getAttribute('Binding') || ''),
          location: sso.getAttribute('Location') || '',
          responseLocation: sso.getAttribute('ResponseLocation') || undefined,
        });
      }
      for (const slo of getElements(idp, NS_MD, 'SingleLogoutService')) {
        endpoints.push({
          type: 'SLO',
          binding: getBindingLabel(slo.getAttribute('Binding') || ''),
          location: slo.getAttribute('Location') || '',
          responseLocation: slo.getAttribute('ResponseLocation') || undefined,
        });
      }
    }

    // SP endpoints
    for (const sp of spDescriptors) {
      for (const acs of getElements(sp, NS_MD, 'AssertionConsumerService')) {
        endpoints.push({
          type: 'ACS',
          binding: getBindingLabel(acs.getAttribute('Binding') || ''),
          location: acs.getAttribute('Location') || '',
          index: acs.hasAttribute('index') ? parseInt(acs.getAttribute('index')!, 10) : undefined,
          isDefault: acs.getAttribute('isDefault') === 'true',
        });
      }
      for (const slo of getElements(sp, NS_MD, 'SingleLogoutService')) {
        endpoints.push({
          type: 'SLO',
          binding: getBindingLabel(slo.getAttribute('Binding') || ''),
          location: slo.getAttribute('Location') || '',
          responseLocation: slo.getAttribute('ResponseLocation') || undefined,
        });
      }
    }

    // Certificates
    const certificates: X509Certificate[] = [];
    const certStrings = extractBase64Certificates(doc);
    for (const certBase64 of certStrings) {
      try {
        const pem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;
        const derBytes = pemToDer(pem);
        const cert = await parseX509(derBytes, derToPem(derBytes));
        certificates.push(cert);
      } catch {
        // Skip unparseable certificates
      }
    }

    // NameID Formats
    const nameIdFormats: string[] = [];
    const formatElements = getElements(doc, NS_MD, 'NameIDFormat');
    for (const el of formatElements) {
      const format = el.textContent?.trim();
      if (format) nameIdFormats.push(format);
    }

    // Organization
    let organization: MetadataOrganization | undefined;
    const orgElements = getElements(entityDescriptor, NS_MD, 'Organization');
    if (orgElements.length > 0) {
      const org = orgElements[0]!;
      organization = {
        name: getElements(org, NS_MD, 'OrganizationName')[0]?.textContent?.trim(),
        displayName: getElements(org, NS_MD, 'OrganizationDisplayName')[0]?.textContent?.trim(),
        url: getElements(org, NS_MD, 'OrganizationURL')[0]?.textContent?.trim(),
      };
    }

    // Requested Attributes (SP metadata)
    const requestedAttributes: ParsedMetadata['requestedAttributes'] = [];
    const attrConsumingServices = getElements(doc, NS_MD, 'AttributeConsumingService');
    for (const svc of attrConsumingServices) {
      const reqAttrs = getElements(svc, NS_MD, 'RequestedAttribute');
      for (const attr of reqAttrs) {
        requestedAttributes.push({
          name: attr.getAttribute('Name') || '',
          friendlyName: attr.getAttribute('FriendlyName') || undefined,
          required: attr.getAttribute('isRequired') === 'true',
        });
      }
    }

    return {
      success: true,
      data: {
        entityId,
        type,
        endpoints,
        certificates,
        nameIdFormats,
        organization,
        requestedAttributes,
        wantAuthnRequestsSigned,
        authnRequestsSigned,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse metadata',
    };
  }
}

export const SAMPLE_IDP_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="https://idp.example.com">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjMwMTAxMDAwMDAwWhcNMjYwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
7a5RHQHDX3b1GmFnm0YNsGKIkldVUDBLJjF5GRTEzg0DQOAGZ+kEMkwEvYGMEqx
7FQDIC0ufFPvqYgsLdMEJJxnYN1aOxgJnA5kUBUel0exOOBfMNPBKBKgM5MOrINe
zMgGaglGEWBObCm+YSPV1IS6e5XC3Y0OKYAAQ8XPGC/GdQbsHAyNIFbUtTxqQ9V
x+Jh+C0I/4eFNkwFB/uxzqtpp2vakk1M93xYNMHFXOEiCVVgcr5CjLfN/9SW+wnA
TDGCVmUOKBxINqEHEH6WwntsJYbMOSMvJLHkMNFBKasDUOHrMKPiF4tWC0DXMppp
lSZk8F0RPgTco9PYRLftAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAA8UeGe/HEyk
ULHeiZPXnX5UGB1pMCR3gdEtB0dBcSDsMG66hLZLqm8bPjxFU2bKuyYxaMUBaYeH
NJxj9BxMkSHmfo2es1GP3aJkHvQdZLJMgrRFhCszKROsyBonT2v8HPkk1UhX3q1n
il8sCcaGL7QSMJSD+ZVQmbeRemyNpCDB1Igj+do2gdqMBNFj3fSJELkKYEoBbpKv
0FNRq4RLhVJwTv+Rl7+hEF+LHXN7BkOFqLYJWOvB1gNru+dRcey9YIUgzUPmNrT
M6JnGEMOrcz9Hk4N1A3m/yTx5GJ9OB3bBdBOSunvLTjnoR9jq7eNZ1FzmVKMIjt
fFI0mTHFKSU=</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/slo"/>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/sso"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.example.com/sso"/>
  </md:IDPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">Example Corp</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">Example Corporation</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://example.com</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;

export const SAMPLE_SP_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://sp.example.com">
  <md:SPSSODescriptor AuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://sp.example.com/acs" index="0" isDefault="true"/>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="https://sp.example.com/acs/artifact" index="1"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://sp.example.com/slo"/>
    <md:AttributeConsumingService index="0">
      <md:ServiceName xml:lang="en">Example SP</md:ServiceName>
      <md:RequestedAttribute Name="urn:oid:0.9.2342.19200300.100.1.3" FriendlyName="mail" isRequired="true"/>
      <md:RequestedAttribute Name="urn:oid:2.5.4.42" FriendlyName="givenName" isRequired="false"/>
      <md:RequestedAttribute Name="urn:oid:2.5.4.4" FriendlyName="surname" isRequired="false"/>
    </md:AttributeConsumingService>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
