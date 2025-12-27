import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeDisplayProps {
  code: string;
  language: string;
  label?: string;
  showLineNumbers?: boolean;
}

function CodeDisplay({ code, language, label, showLineNumbers = false }: CodeDisplayProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="border border-slate-300 rounded-md overflow-hidden bg-white">
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            maxHeight: '720px',
            overflowY: 'auto',
            background: 'white',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
          }}
        >
          {code || ''}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default CodeDisplay;
