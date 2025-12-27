'use client';

import { useState } from 'react';
import ToolLayout from '../ToolLayout';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';
import { generateUUIDs } from '../../../utils/uuid';

function UuidGenerator() {
  const [quantity, setQuantity] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);

  const handleGenerate = () => {
    const generated = generateUUIDs(quantity);
    setUuids(generated);
  };

  return (
    <ToolLayout
      title="UUID Generator"
      description="Generate UUIDs (v4) for your applications"
    >
      <div className="space-y-6">
        {/* Quantity Control */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Number of UUIDs
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value))))}
            className="w-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">Generate between 1 and 50 UUIDs</p>
        </div>

        <Button label="Generate UUIDs" onClick={handleGenerate} variant="primary" />

        {uuids.length > 0 && (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Generated UUIDs ({uuids.length}):
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uuids.map((uuid, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-900">{uuid}</span>
                  </div>
                ))}
              </div>
            </div>
            <CopyButton text={uuids.join('\n')} label="Copy All UUIDs" />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

export default UuidGenerator;
