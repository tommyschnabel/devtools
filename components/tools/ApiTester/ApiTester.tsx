'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ToolLayout from '../ToolLayout';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';
import { testApi } from '../../../utils/apiTester';
import type { ApiResponse } from '../../../utils/apiTester';

type LanguageOption = 'typescript' | 'csharp' | 'swift' | 'kotlin' | 'go' | 'rust';

function ApiTester() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('typescript');

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
    const resources = ['posts', 'comments', 'albums', 'photos', 'todos', 'users'];
    const randomResource = resources[Math.floor(Math.random() * resources.length)];
    const randomId = Math.floor(Math.random() * 10) + 1; // IDs 1-10 for variety

    setUrl(`https://jsonplaceholder.typicode.com/${randomResource}/${randomId}`);
    setMethod('GET');
    setResponse(null);
  };

  const languageRoutes: Record<LanguageOption, string> = {
    typescript: '/tools/json-to-typescript',
    csharp: '/tools/json-to-csharp',
    swift: '/tools/json-to-swift',
    kotlin: '/tools/json-to-kotlin',
    go: '/tools/json-to-go',
    rust: '/tools/json-to-rust',
  };

  const languageNames: Record<LanguageOption, string> = {
    typescript: 'TypeScript',
    csharp: 'C#',
    swift: 'Swift',
    kotlin: 'Kotlin',
    go: 'Go',
    rust: 'Rust',
  };

  const generateCode = () => {
    if (!response?.body) return;

    try {
      JSON.parse(response.body);
      sessionStorage.setItem('jsonInput', response.body);
      router.push(languageRoutes[selectedLanguage]);
    } catch (error) {
      alert(`Response is not valid JSON. ${languageNames[selectedLanguage]} code can only be generated from JSON responses.`);
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
                  <CopyButton text={response.body} label="Copy Body" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                  <pre className="text-sm font-mono text-slate-900 whitespace-pre-wrap break-words max-h-96 overflow-auto">
                    {response.body}
                  </pre>
                </div>
                <div className="flex gap-2 items-center mt-3">
                  <label className="text-sm font-medium text-slate-700">
                    Generate code from response:
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as LanguageOption)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="csharp">C#</option>
                    <option value="swift">Swift</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                  </select>
                  <button
                    onClick={generateCode}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                  >
                    Generate Code →
                  </button>
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
