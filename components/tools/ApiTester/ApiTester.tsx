'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ToolLayout from '../ToolLayout';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';
import { testApi } from '../../../utils/apiTester';
import type { ApiResponse } from '../../../utils/apiTester';

function ApiTester() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const sendRequest = async () => {
    if (!url.trim()) {
      setResponse({
        success: false,
        error: 'Please enter a URL',
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    const result = await testApi(url, method);
    setResponse(result);
    setLoading(false);
  };

  const clear = () => {
    setUrl('');
    setMethod('GET');
    setResponse(null);
  };

  const loadSampleApi = () => {
    setUrl('https://jsonplaceholder.typicode.com/posts/1');
    setMethod('GET');
    setResponse(null);
  };

  const generateTypeScript = () => {
    if (!response?.body) return;

    // Validate JSON
    try {
      JSON.parse(response.body);
      // Navigate to JSON to TypeScript tool with the response body
      // Store in sessionStorage for Next.js navigation
      sessionStorage.setItem('jsonInput', response.body);
      router.push('/tools/json-to-typescript');
    } catch (error) {
      // Not valid JSON, show error
      alert('Response is not valid JSON. TypeScript types can only be generated from JSON responses.');
    }
  };

  const generateCSharp = () => {
    if (!response?.body) return;

    // Validate JSON
    try {
      JSON.parse(response.body);
      // Navigate to JSON to C# tool with the response body
      // Store in sessionStorage for Next.js navigation
      sessionStorage.setItem('jsonInput', response.body);
      router.push('/tools/json-to-csharp');
    } catch (error) {
      // Not valid JSON, show error
      alert('Response is not valid JSON. C# classes can only be generated from JSON responses.');
    }
  };

  const generateSwift = () => {
    if (!response?.body) return;

    // Validate JSON
    try {
      JSON.parse(response.body);
      // Navigate to JSON to Swift tool with the response body
      // Store in sessionStorage for Next.js navigation
      sessionStorage.setItem('jsonInput', response.body);
      router.push('/tools/json-to-swift');
    } catch (error) {
      // Not valid JSON, show error
      alert('Response is not valid JSON. Swift structs can only be generated from JSON responses.');
    }
  };

  return (
    <ToolLayout
      title="API Tester"
      description="Test API endpoints and view responses"
    >
      <div className="space-y-6">
        {/* URL Input and Method */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                API URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendRequest();
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
                className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              label={loading ? 'Sending...' : 'Send Request'}
              onClick={sendRequest}
              variant="primary"
              disabled={loading}
            />
            <Button label="Load Sample API" onClick={loadSampleApi} variant="secondary" />
            <Button label="Clear" onClick={clear} variant="secondary" />
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className="space-y-4">
            {/* Status and Metadata */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Status</p>
                  <p className={`text-lg font-semibold ${
                    response.success && response.status && response.status < 400
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {response.status ? `${response.status} ${response.statusText}` : 'Error'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Response Time</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {response.responseTime}ms
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {!response.success && response.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700 font-medium">Error:</p>
                <p className="text-red-600 text-sm">{response.error}</p>
              </div>
            )}

            {/* Response Headers */}
            {response.headers && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Response Headers
                  </label>
                  <CopyButton
                    text={JSON.stringify(response.headers, null, 2)}
                    label="Copy Headers"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 max-h-48 overflow-auto">
                  <pre className="text-xs font-mono text-slate-700">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Response Body */}
            {response.body && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Response Body
                  </label>
                  <div className="flex gap-2">
                    <CopyButton text={response.body} label="Copy Body" />
                    <button
                      onClick={generateTypeScript}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Generate TypeScript →
                    </button>
                    <button
                      onClick={generateCSharp}
                      className="px-4 py-2 bg-purple-500 text-white rounded-md font-medium hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Generate C# →
                    </button>
                    <button
                      onClick={generateSwift}
                      className="px-4 py-2 bg-orange-500 text-white rounded-md font-medium hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      Generate Swift →
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                  <pre className="text-sm font-mono text-slate-900 whitespace-pre-wrap break-words max-h-96 overflow-auto">
                    {response.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> CORS restrictions may prevent requests to some APIs. Use APIs that allow cross-origin requests or test with public APIs.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

export default ApiTester;
