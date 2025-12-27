/**
 * JWT decoding utilities
 */

export interface DecodedJWT {
  header: any;
  payload: any;
  signature: string;
  raw: {
    header: string;
    payload: string;
    signature: string;
  };
}

function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Pad with '=' to make length a multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    // Decode base64
    const decoded = atob(base64);
    return decoded;
  } catch (error) {
    throw new Error('Invalid base64 encoding');
  }
}

export function decodeJWT(token: string): { success: boolean; data?: DecodedJWT; error?: string } {
  try {
    // Remove whitespace
    token = token.trim();

    // Split the token into parts
    const parts = token.split('.');

    if (parts.length !== 3) {
      return {
        success: false,
        error: 'Invalid JWT format. Expected 3 parts separated by dots.',
      };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    let header: any;
    try {
      const headerStr = base64UrlDecode(headerB64!);
      header = JSON.parse(headerStr);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decode header. Invalid base64 or JSON.',
      };
    }

    // Decode payload
    let payload: any;
    try {
      const payloadStr = base64UrlDecode(payloadB64!);
      payload = JSON.parse(payloadStr);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decode payload. Invalid base64 or JSON.',
      };
    }

    return {
      success: true,
      data: {
        header,
        payload,
        signature: signatureB64!,
        raw: {
          header: headerB64!,
          payload: payloadB64!,
          signature: signatureB64!,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decode JWT',
    };
  }
}

export function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp * 1000); // JWT timestamps are in seconds
    return date.toLocaleString();
  } catch {
    return 'Invalid timestamp';
  }
}
