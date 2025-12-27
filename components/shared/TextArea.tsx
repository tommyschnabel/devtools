interface TextAreaProps {
  value: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
  rows?: number;
}

function TextArea({
  value,
  onChange,
  label,
  placeholder,
  readOnly = false,
  error,
  rows = 10,
}: TextAreaProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300'
        } ${readOnly ? 'bg-slate-50' : 'bg-white'}`}
      />
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}

export default TextArea;
