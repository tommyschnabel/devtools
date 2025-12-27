'use client';

import { useState } from 'react';
import ToolLayout from '../ToolLayout';
import TextArea from '../../shared/TextArea';
import CodeDisplay from '../../shared/CodeDisplay';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';

function JsonPrettifier() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const generateRandomJson = () => {
    const randomData = {
      id: Math.floor(Math.random() * 10000),
      name: 'Sample User',
      email: 'user@example.com',
      isActive: Math.random() > 0.5,
      age: Math.floor(Math.random() * 50) + 20,
      address: {
        street: '123 Main St',
        city: 'New York',
        zipCode: '10001',
        coordinates: {
          lat: (Math.random() * 180 - 90).toFixed(6),
          lng: (Math.random() * 360 - 180).toFixed(6),
        },
      },
      tags: ['developer', 'javascript', 'react'],
      createdAt: new Date().toISOString(),
      metadata: {
        lastLogin: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        loginCount: Math.floor(Math.random() * 100),
      },
    };
    const minified = JSON.stringify(randomData);
    setInput(minified);
    setOutput('');
    setError('');
  };

  const prettify = () => {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setOutput('');
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setOutput('');
    }
  };

  const clear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <ToolLayout
      title="JSON Prettifier"
      description="Format, validate, and minify JSON data"
    >
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button label="Prettify" onClick={prettify} variant="primary" />
          <Button label="Minify" onClick={minify} variant="primary" />
          <Button label="Generate Sample" onClick={generateRandomJson} variant="secondary" />
          <Button label="Clear" onClick={clear} variant="secondary" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700 font-medium">Error:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Side by Side Input/Output */}
        <div className="grid grid-cols-2 gap-4">
          {/* Input Column */}
          <div className="space-y-2">
            <TextArea
              value={input}
              onChange={setInput}
              label="Input JSON"
              placeholder='{"example": "paste your JSON here"}'
              rows={30}
            />
          </div>

          {/* Output Column */}
          <div className="space-y-2">
            {output ? (
              <>
                <CodeDisplay
                  code={output}
                  language="json"
                  label="Output"
                />
                <CopyButton text={output} label="Copy Output" />
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Output</label>
                <div className="border border-slate-300 rounded-md bg-slate-50 h-[720px] flex items-center justify-center">
                  <p className="text-slate-400 text-sm">Formatted JSON will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

export default JsonPrettifier;
