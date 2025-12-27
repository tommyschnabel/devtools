/**
 * API testing utilities
 */

export type ApiResponse = {
  success: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
  responseTime?: number;
};

export async function testApi(url: string, method: 'GET' | 'POST'): Promise<ApiResponse> {
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Get headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get response body
    const contentType = response.headers.get('content-type') || '';
    let body = '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      body = JSON.stringify(json, null, 2);
    } else {
      body = await response.text();
    }

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      responseTime,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch',
      responseTime,
    };
  }
}
