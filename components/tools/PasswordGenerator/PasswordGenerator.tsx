'use client';

import { useState } from 'react';
import ToolLayout from '../ToolLayout';
import Button from '../../shared/Button';
import CopyButton from '../../shared/CopyButton';
import { generatePassword } from '../../../utils/password';

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = () => {
    try {
      const generated = generatePassword({ length, ...options });
      setPassword(generated);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate password');
      setPassword('');
    }
  };

  const handleOptionChange = (option: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [option]: !prev[option] }));
  };

  const atLeastOneSelected = Object.values(options).some((val) => val);

  return (
    <ToolLayout
      title="Password Generator"
      description="Generate secure random passwords with customizable options"
    >
      <div className="space-y-6">
        {/* Length Control */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Password Length: {length}
          </label>
          <input
            type="range"
            min="8"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>8</span>
            <span>64</span>
          </div>
        </div>

        {/* Character Options */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Character Types
          </label>
          <div className="space-y-2">
            {[
              { key: 'uppercase', label: 'Uppercase Letters (A-Z)' },
              { key: 'lowercase', label: 'Lowercase Letters (a-z)' },
              { key: 'numbers', label: 'Numbers (0-9)' },
              { key: 'symbols', label: 'Symbols (!@#$%^&*)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[key as keyof typeof options]}
                  onChange={() => handleOptionChange(key as keyof typeof options)}
                  className="w-4 h-4 text-blue-500 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          label="Generate Password"
          onClick={handleGenerate}
          variant="primary"
          disabled={!atLeastOneSelected}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {password && (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Generated Password:</p>
              <p className="font-mono text-lg text-slate-900 break-all">{password}</p>
            </div>
            <CopyButton text={password} label="Copy Password" />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

export default PasswordGenerator;
