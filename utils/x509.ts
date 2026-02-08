/**
 * Lightweight X.509 certificate parser using ASN.1 DER decoding.
 * Zero external dependencies — uses Web Crypto API for fingerprints.
 */

// ASN.1 tag types
const ASN1_SEQUENCE = 0x30;
const ASN1_SET = 0x31;
const ASN1_INTEGER = 0x02;
const ASN1_BIT_STRING = 0x03;
const ASN1_OCTET_STRING = 0x04;
const ASN1_OID = 0x06;
const ASN1_UTF8_STRING = 0x0c;
const ASN1_PRINTABLE_STRING = 0x13;
const ASN1_IA5_STRING = 0x16;
const ASN1_UTC_TIME = 0x17;
const ASN1_GENERALIZED_TIME = 0x18;
const ASN1_CONTEXT_0 = 0xa0;
const ASN1_CONTEXT_3 = 0xa3;

interface ASN1Node {
  tag: number;
  length: number;
  value: Uint8Array;
  children?: ASN1Node[];
  headerLength: number;
}

function parseASN1(data: Uint8Array, offset: number = 0): ASN1Node {
  if (offset >= data.length) throw new Error('Unexpected end of ASN.1 data');

  const tag = data[offset]!;
  let pos = offset + 1;

  // Parse length
  let length: number;
  const firstLenByte = data[pos]!;
  pos++;

  if (firstLenByte < 0x80) {
    length = firstLenByte;
  } else {
    const numLenBytes = firstLenByte & 0x7f;
    length = 0;
    for (let i = 0; i < numLenBytes; i++) {
      length = (length << 8) | data[pos]!;
      pos++;
    }
  }

  const headerLength = pos - offset;
  const value = data.slice(pos, pos + length);

  const node: ASN1Node = { tag, length, value, headerLength };

  // Parse children for constructed types
  const isConstructed = (tag & 0x20) !== 0 || tag === ASN1_SEQUENCE || tag === ASN1_SET ||
    tag === ASN1_CONTEXT_0 || tag === ASN1_CONTEXT_3 || (tag >= 0xa0 && tag <= 0xaf);
  if (isConstructed && length > 0) {
    node.children = parseASN1Children(value);
  }

  return node;
}

function parseASN1Children(data: Uint8Array): ASN1Node[] {
  const children: ASN1Node[] = [];
  let pos = 0;
  while (pos < data.length) {
    try {
      const child = parseASN1(data, pos);
      children.push(child);
      pos += child.headerLength + child.length;
    } catch {
      break;
    }
  }
  return children;
}

function asn1ToString(node: ASN1Node): string {
  const tag = node.tag;
  if (tag === ASN1_UTF8_STRING || tag === ASN1_PRINTABLE_STRING || tag === ASN1_IA5_STRING) {
    return new TextDecoder().decode(node.value);
  }
  // Try decoding as UTF8 for other string-like types
  if (tag >= 0x12 && tag <= 0x1e) {
    return new TextDecoder().decode(node.value);
  }
  return new TextDecoder().decode(node.value);
}

// Well-known OIDs
const OID_MAP: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.5': 'serialNumber',
  '2.5.4.12': 'title',
  '2.5.4.42': 'givenName',
  '2.5.4.4': 'surname',
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.10045.2.1': 'EC',
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.15': 'keyUsage',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extKeyUsage',
};

function decodeOID(data: Uint8Array): string {
  if (data.length === 0) return '';
  const components: number[] = [];
  const first = data[0]!;
  components.push(Math.floor(first / 40));
  components.push(first % 40);

  let value = 0;
  for (let i = 1; i < data.length; i++) {
    const byte = data[i]!;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      components.push(value);
      value = 0;
    }
  }
  return components.join('.');
}

function parseDN(node: ASN1Node): string {
  if (!node.children) return '';
  const parts: string[] = [];
  for (const set of node.children) {
    if (!set.children) continue;
    for (const seq of set.children) {
      if (!seq.children || seq.children.length < 2) continue;
      const oidNode = seq.children[0]!;
      const valueNode = seq.children[1]!;
      const oid = decodeOID(oidNode.value);
      const name = OID_MAP[oid] || oid;
      const value = asn1ToString(valueNode);
      parts.push(`${name}=${value}`);
    }
  }
  return parts.join(', ');
}

function parseDNComponents(node: ASN1Node): Record<string, string> {
  const result: Record<string, string> = {};
  if (!node.children) return result;
  for (const set of node.children) {
    if (!set.children) continue;
    for (const seq of set.children) {
      if (!seq.children || seq.children.length < 2) continue;
      const oidNode = seq.children[0]!;
      const valueNode = seq.children[1]!;
      const oid = decodeOID(oidNode.value);
      const name = OID_MAP[oid] || oid;
      const value = asn1ToString(valueNode);
      result[name] = value;
    }
  }
  return result;
}

function parseTime(node: ASN1Node): Date {
  const str = new TextDecoder().decode(node.value);
  if (node.tag === ASN1_UTC_TIME) {
    // YYMMDDHHmmssZ
    const year = parseInt(str.substring(0, 2), 10);
    const fullYear = year >= 50 ? 1900 + year : 2000 + year;
    return new Date(`${fullYear}-${str.substring(2, 4)}-${str.substring(4, 6)}T${str.substring(6, 8)}:${str.substring(8, 10)}:${str.substring(10, 12)}Z`);
  }
  // GeneralizedTime: YYYYMMDDHHmmssZ
  return new Date(`${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}T${str.substring(8, 10)}:${str.substring(10, 12)}:${str.substring(12, 14)}Z`);
}

function bytesToHex(bytes: Uint8Array, separator: string = ':'): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(separator);
}

function serialToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':');
}

const KEY_USAGE_BITS = [
  'digitalSignature',
  'nonRepudiation',
  'keyEncipherment',
  'dataEncipherment',
  'keyAgreement',
  'keyCertSign',
  'cRLSign',
  'encipherOnly',
  'decipherOnly',
];

function parseKeyUsage(data: Uint8Array): string[] {
  if (data.length === 0) return [];
  // Key usage is a BIT STRING; first byte is number of unused bits
  const node = parseASN1(data, 0);
  if (node.tag !== ASN1_BIT_STRING || node.value.length < 2) return [];
  const unusedBits = node.value[0]!;
  const usageBytes = node.value.slice(1);
  const usages: string[] = [];
  for (let byteIdx = 0; byteIdx < usageBytes.length; byteIdx++) {
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const totalBit = byteIdx * 8 + bitIdx;
      if (byteIdx === usageBytes.length - 1 && bitIdx >= 8 - unusedBits) break;
      if ((usageBytes[byteIdx]! >> (7 - bitIdx)) & 1) {
        if (totalBit < KEY_USAGE_BITS.length) {
          usages.push(KEY_USAGE_BITS[totalBit]!);
        }
      }
    }
  }
  return usages;
}

function parseSANs(data: Uint8Array): string[] {
  const sans: string[] = [];
  try {
    const node = parseASN1(data, 0);
    // OCTET STRING wrapping SEQUENCE of GeneralName
    const seqData = node.tag === ASN1_OCTET_STRING ? node.value : data;
    const seq = parseASN1(seqData, 0);
    if (seq.children) {
      for (const child of seq.children) {
        // context tag [2] = dNSName, [7] = iPAddress
        if (child.tag === 0x82) {
          sans.push(new TextDecoder().decode(child.value));
        } else if (child.tag === 0x87) {
          // IP address
          if (child.value.length === 4) {
            sans.push(Array.from(child.value).join('.'));
          } else if (child.value.length === 16) {
            const parts: string[] = [];
            for (let i = 0; i < 16; i += 2) {
              parts.push(((child.value[i]! << 8) | child.value[i + 1]!).toString(16));
            }
            sans.push(parts.join(':'));
          }
        } else if (child.tag === 0x86) {
          // URI
          sans.push(new TextDecoder().decode(child.value));
        }
      }
    }
  } catch {
    // SANs parsing is best-effort
  }
  return sans;
}

function parseExtKeyUsage(data: Uint8Array): string[] {
  const usages: string[] = [];
  try {
    const node = parseASN1(data, 0);
    const seqData = node.tag === ASN1_OCTET_STRING ? node.value : data;
    const seq = parseASN1(seqData, 0);
    if (seq.children) {
      for (const child of seq.children) {
        if (child.tag === ASN1_OID) {
          const oid = decodeOID(child.value);
          usages.push(OID_MAP[oid] || oid);
        }
      }
    }
  } catch {
    // Best-effort
  }
  return usages;
}

export interface X509Certificate {
  subject: string;
  subjectComponents: Record<string, string>;
  issuer: string;
  issuerComponents: Record<string, string>;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize?: number;
  keyUsage: string[];
  extKeyUsage: string[];
  sans: string[];
  isCA: boolean;
  sha1Fingerprint: string;
  sha256Fingerprint: string;
  pem: string;
  derBase64: string;
}

export type ExpiryStatus = 'valid' | 'expiring-soon' | 'expired';

export function getExpiryStatus(cert: X509Certificate): ExpiryStatus {
  const now = new Date();
  if (cert.notAfter < now) return 'expired';
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (cert.notAfter < thirtyDaysFromNow) return 'expiring-soon';
  return 'valid';
}

function getPublicKeySize(spki: ASN1Node): number | undefined {
  try {
    if (!spki.children || spki.children.length < 2) return undefined;
    const bitString = spki.children[1]!;
    if (bitString.tag !== ASN1_BIT_STRING) return undefined;
    // Skip the "unused bits" byte
    const keyData = bitString.value.slice(1);
    // For RSA, the key data is a SEQUENCE containing the modulus
    const keySeq = parseASN1(keyData, 0);
    if (keySeq.children && keySeq.children.length >= 1) {
      const modulus = keySeq.children[0]!;
      // Key size in bits (subtract 1 byte if leading zero for sign)
      let size = modulus.value.length;
      if (modulus.value[0] === 0) size--;
      return size * 8;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function computeFingerprint(derBytes: Uint8Array, algorithm: string): Promise<string> {
  const hash = await crypto.subtle.digest(algorithm, derBytes as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hash));
}

export function pemToDer(pem: string): Uint8Array {
  const lines = pem.split('\n').filter(l => !l.startsWith('-----')).join('');
  const binary = atob(lines.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function derToPem(der: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...der));
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

export async function parseX509(derBytes: Uint8Array, pemStr?: string): Promise<X509Certificate> {
  const root = parseASN1(derBytes, 0);
  if (!root.children || root.children.length < 3) {
    throw new Error('Invalid X.509 certificate structure');
  }

  const tbsCertificate = root.children[0]!;
  const sigAlgNode = root.children[1]!;

  if (!tbsCertificate.children) {
    throw new Error('Invalid TBS certificate');
  }

  let idx = 0;

  // Version (optional, context [0])
  if (tbsCertificate.children[idx]?.tag === ASN1_CONTEXT_0) {
    idx++;
  }

  // Serial number
  const serialNode = tbsCertificate.children[idx]!;
  const serialNumber = serialToHex(serialNode.value);
  idx++;

  // Signature algorithm (inside TBS)
  idx++;

  // Issuer
  const issuerNode = tbsCertificate.children[idx]!;
  const issuer = parseDN(issuerNode);
  const issuerComponents = parseDNComponents(issuerNode);
  idx++;

  // Validity
  const validityNode = tbsCertificate.children[idx]!;
  if (!validityNode.children || validityNode.children.length < 2) {
    throw new Error('Invalid validity period');
  }
  const notBefore = parseTime(validityNode.children[0]!);
  const notAfter = parseTime(validityNode.children[1]!);
  idx++;

  // Subject
  const subjectNode = tbsCertificate.children[idx]!;
  const subject = parseDN(subjectNode);
  const subjectComponents = parseDNComponents(subjectNode);
  idx++;

  // Subject Public Key Info
  const spkiNode = tbsCertificate.children[idx]!;
  let publicKeyAlgorithm = 'Unknown';
  let publicKeySize: number | undefined;
  if (spkiNode.children && spkiNode.children.length >= 1) {
    const algSeq = spkiNode.children[0]!;
    if (algSeq.children && algSeq.children.length >= 1) {
      const oid = decodeOID(algSeq.children[0]!.value);
      publicKeyAlgorithm = OID_MAP[oid] || oid;
    }
    publicKeySize = getPublicKeySize(spkiNode);
  }
  idx++;

  // Signature algorithm (outer)
  let signatureAlgorithm = 'Unknown';
  if (sigAlgNode.children && sigAlgNode.children.length >= 1) {
    const oid = decodeOID(sigAlgNode.children[0]!.value);
    signatureAlgorithm = OID_MAP[oid] || oid;
  }

  // Extensions (optional)
  let keyUsage: string[] = [];
  let extKeyUsage: string[] = [];
  let sans: string[] = [];
  let isCA = false;

  // Look for extensions in remaining TBS children
  for (let i = idx; i < tbsCertificate.children.length; i++) {
    const child = tbsCertificate.children[i]!;
    if (child.tag === ASN1_CONTEXT_3 && child.children) {
      // Extensions SEQUENCE
      const extsSeq = child.children[0];
      if (extsSeq?.children) {
        for (const ext of extsSeq.children) {
          if (!ext.children || ext.children.length < 2) continue;
          const extOid = decodeOID(ext.children[0]!.value);
          const extName = OID_MAP[extOid];
          // The value is the last child (could be critical flag before it)
          const extValue = ext.children[ext.children.length - 1]!;

          if (extName === 'keyUsage') {
            keyUsage = parseKeyUsage(extValue.value);
          } else if (extName === 'subjectAltName') {
            sans = parseSANs(extValue.value);
          } else if (extName === 'basicConstraints') {
            try {
              const bcNode = parseASN1(extValue.value, 0);
              if (bcNode.children && bcNode.children.length > 0) {
                // First element is cA BOOLEAN
                isCA = bcNode.children[0]!.value.length > 0 && bcNode.children[0]!.value[0] !== 0;
              }
            } catch {
              // Best-effort
            }
          } else if (extName === 'extKeyUsage') {
            extKeyUsage = parseExtKeyUsage(extValue.value);
          }
        }
      }
    }
  }

  // Fingerprints
  const [sha1Fingerprint, sha256Fingerprint] = await Promise.all([
    computeFingerprint(derBytes, 'SHA-1'),
    computeFingerprint(derBytes, 'SHA-256'),
  ]);

  // PEM
  const pem = pemStr || derToPem(derBytes);
  const derBase64 = btoa(String.fromCharCode(...derBytes));

  return {
    subject,
    subjectComponents,
    issuer,
    issuerComponents,
    serialNumber,
    notBefore,
    notAfter,
    signatureAlgorithm,
    publicKeyAlgorithm,
    publicKeySize,
    keyUsage,
    extKeyUsage,
    sans,
    isCA,
    sha1Fingerprint,
    sha256Fingerprint,
    pem,
    derBase64,
  };
}

export function extractPemCertificates(input: string): string[] {
  const pemRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
  return input.match(pemRegex) || [];
}

export function extractBase64Certificates(xmlDoc: Document): string[] {
  const certs: string[] = [];
  const certElements = xmlDoc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
  for (let i = 0; i < certElements.length; i++) {
    const text = certElements[i]!.textContent?.trim();
    if (text) certs.push(text);
  }
  return certs;
}
