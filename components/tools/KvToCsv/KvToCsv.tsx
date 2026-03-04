'use client';

import { useState } from 'react';
import ToolLayout from '../ToolLayout';
import TextArea from '../../shared/TextArea';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';

function KvToCsv() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const convert = () => {
    try {
      if (!input.trim()) {
        setError('Please enter some key-value pairs');
        setOutput('');
        return;
      }

      const lines = input.split('\n').filter(line => line.trim());
      const allKeys = new Set<string>();
      const parsedLines: Map<string, string>[] = [];

      for (const line of lines) {
        const pairs = line.match(/(?:[^\s=]+=[^\s=]+|\S+)/g) || [];
        const lineMap = new Map<string, string>();

        for (const pair of pairs) {
          const eqIndex = pair.indexOf('=');
          if (eqIndex > 0) {
            const key = pair.slice(0, eqIndex).trim();
            const value = pair.slice(eqIndex + 1).trim();
            if (key) {
              allKeys.add(key);
              lineMap.set(key, value);
            }
          }
        }

        parsedLines.push(lineMap);
      }

      if (allKeys.size === 0) {
        setError('No valid key=value pairs found');
        setOutput('');
        return;
      }

      const sortedKeys = Array.from(allKeys).sort();
      const csvLines: string[] = [];

      // Header
      csvLines.push(sortedKeys.map(k => escapeCsv(k)).join(','));

      // Data rows
      for (const lineMap of parsedLines) {
        const row = sortedKeys.map(key => {
          const value = lineMap.get(key) || '';
          return escapeCsv(value);
        });
        csvLines.push(row.join(','));
      }

      setOutput(csvLines.join('\n'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
      setOutput('');
    }
  };

  const escapeCsv = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  };

  const clear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const generateSample = () => {
    const sample = `a.b.c=asdf b.c=fdsa
a.b.c=hello b.c=world x.y=extra
b.c=test a.b.c=value`;
    setInput(sample);
    setOutput('');
    setError('');
  };

  return (
    <ToolLayout
      title="KV to CSV Converter"
      description="Convert key=value pairs to CSV format"
      fullWidth
    >
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button label="Convert to CSV" onClick={convert} variant="primary" />
          <Button label="Generate Sample" onClick={generateSample} variant="secondary" />
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
              label="Input (key=value pairs)"
              placeholder="Enter key=value pairs separated by spaces, one line per row&#10;e.g. a.b.c=asdf b.c=fdsa"
              rows={30}
            />
          </div>

          {/* Output Column */}
          <div className="space-y-2">
            <TextArea
              value={output}
              label="Output (CSV)"
              readOnly
              rows={30}
            />
            {output && <CopyButton text={output} label="Copy CSV" />}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

export default KvToCsv;
