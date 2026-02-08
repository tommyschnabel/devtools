/**
 * SAML Certificate inspection utility.
 * Auto-detects input format: PEM, Base64 DER, SAML metadata XML, SAML response XML.
 * Extracts and parses X.509 certificates with full details.
 */

import {
  parseX509,
  pemToDer,
  derToPem,
  extractPemCertificates,
  extractBase64Certificates,
  type X509Certificate,
} from './x509';

export type InputFormat = 'PEM' | 'Base64 DER' | 'SAML Metadata XML' | 'SAML Response XML' | 'Unknown';

export interface CertInspectionResult {
  format: InputFormat;
  certificates: X509Certificate[];
}

function looksLikeXml(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith('<') || trimmed.startsWith('<?xml');
}

function looksLikePem(input: string): boolean {
  return input.includes('-----BEGIN CERTIFICATE-----');
}

function detectXmlType(doc: Document): InputFormat {
  // Check for SAML metadata
  const mdNs = 'urn:oasis:names:tc:SAML:2.0:metadata';
  if (doc.getElementsByTagNameNS(mdNs, 'EntityDescriptor').length > 0) {
    return 'SAML Metadata XML';
  }
  // Check for SAML response
  const samlpNs = 'urn:oasis:names:tc:SAML:2.0:protocol';
  if (doc.getElementsByTagNameNS(samlpNs, 'Response').length > 0) {
    return 'SAML Response XML';
  }
  // Any XML with X509Certificate elements
  const dsNs = 'http://www.w3.org/2000/09/xmldsig#';
  if (doc.getElementsByTagNameNS(dsNs, 'X509Certificate').length > 0) {
    return 'SAML Metadata XML';
  }
  return 'Unknown';
}

export async function inspectCertificates(
  input: string
): Promise<{ success: boolean; data?: CertInspectionResult; error?: string }> {
  try {
    if (!input.trim()) {
      return { success: false, error: 'Input is empty' };
    }

    const trimmed = input.trim();
    const certificates: X509Certificate[] = [];
    let format: InputFormat = 'Unknown';

    // Try PEM
    if (looksLikePem(trimmed)) {
      format = 'PEM';
      const pems = extractPemCertificates(trimmed);
      if (pems.length === 0) {
        return { success: false, error: 'No valid PEM certificates found in input.' };
      }
      for (const pem of pems) {
        const derBytes = pemToDer(pem);
        const cert = await parseX509(derBytes, pem);
        certificates.push(cert);
      }
    }
    // Try XML
    else if (looksLikeXml(trimmed)) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return { success: false, error: 'Invalid XML: ' + (parseError.textContent || 'Parse error') };
      }

      format = detectXmlType(doc);
      const certStrings = extractBase64Certificates(doc);
      if (certStrings.length === 0) {
        return { success: false, error: 'No X.509 certificates found in the XML.' };
      }
      for (const certBase64 of certStrings) {
        const pem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;
        const derBytes = pemToDer(pem);
        const cert = await parseX509(derBytes, derToPem(derBytes));
        certificates.push(cert);
      }
    }
    // Try as raw Base64 DER
    else {
      format = 'Base64 DER';
      try {
        const cleaned = trimmed.replace(/\s/g, '');
        const binary = atob(cleaned);
        const derBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          derBytes[i] = binary.charCodeAt(i);
        }
        const cert = await parseX509(derBytes, derToPem(derBytes));
        certificates.push(cert);
      } catch {
        return {
          success: false,
          error: 'Unable to parse input. Accepted formats: PEM, Base64 DER, SAML metadata XML, or SAML response XML.',
        };
      }
    }

    if (certificates.length === 0) {
      return { success: false, error: 'No certificates could be parsed from the input.' };
    }

    return {
      success: true,
      data: { format, certificates },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to inspect certificates',
    };
  }
}

// Sample PEM certificate
export const SAMPLE_PEM_CERT = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
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
fFI0mTHFKSU=
-----END CERTIFICATE-----`;
