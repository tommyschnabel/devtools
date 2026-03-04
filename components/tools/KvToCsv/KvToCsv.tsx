'use client';

import { useState, useRef } from 'react';
import ToolLayout from '../ToolLayout';
import TextArea from '../../shared/TextArea';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';

function KvToCsv() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseKvPairs = (line: string): Map<string, string> => {
    const lineMap = new Map<string, string>();
    let i = 0;

    while (i < line.length) {
      // Skip whitespace
      while (i < line.length && /\s/.test(line[i]!)) i++;
      if (i >= line.length) break;

      // Find key (everything until =)
      const keyStart = i;
      while (i < line.length && line[i] !== '=') i++;
      if (i >= line.length || line[i] !== '=') break;

      const key = line.slice(keyStart, i).trim();
      i++; // skip =

      // Find value (handle quoted values)
      let value = '';
      if (i < line.length && line[i] === '"') {
        // Quoted value
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            // Escaped quote
            value += '"';
            i += 2;
          } else if (line[i] === '"') {
            // End of quoted value
            i++;
            break;
          } else {
            value += line[i];
            i++;
          }
        }
      } else {
        // Unquoted value - read until whitespace
        const valueStart = i;
        while (i < line.length && !/\s/.test(line[i]!)) i++;
        value = line.slice(valueStart, i);
      }

      if (key) {
        lineMap.set(key, value);
      }
    }

    return lineMap;
  };

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
        const lineMap = parseKvPairs(line);
        for (const key of lineMap.keys()) {
          allKeys.add(key);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInput(text);
      setOutput('');
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadCsv = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'output.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <Button label="Upload File" onClick={triggerFileUpload} variant="secondary" />
          <Button label="Generate Sample" onClick={generateSample} variant="secondary" />
          <Button label="Clear" onClick={clear} variant="secondary" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.log,.csv,.tsv,.json,.xml,.md"
            className="hidden"
          />
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
            {output && (
              <div className="flex gap-2">
                <CopyButton text={output} label="Copy CSV" />
                <Button label="Download CSV" onClick={downloadCsv} variant="secondary" />
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

export default KvToCsv;
