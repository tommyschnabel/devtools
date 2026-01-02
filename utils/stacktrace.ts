export type Language = 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'php' | 'ruby' | 'unknown';

export interface FormatOptions {
  language: Language;
  removeSensitiveData: boolean;
  showHighlighting: boolean;
}

export interface FormatResult {
  success: boolean;
  output?: string;
  error?: string;
  detectedLanguage?: Language;
}

export interface StacktraceLine {
  original: string;
  formatted: string;
  indent: number;
  isError: boolean;
  filePath?: string;
  lineNumber?: string;
  functionName?: string;
}

export interface HighlightedPart {
  text: string;
  type: 'error' | 'filePath' | 'lineNumber' | 'functionName' | 'normal';
}

type LanguagePatterns = {
  error: RegExp;
  frame: RegExp;
  frameAlternative?: RegExp;
  frameAlt?: RegExp;
  frameNative?: RegExp;
  frameUnknown?: RegExp;
  frameAlt2?: RegExp;
};

const LANGUAGE_PATTERNS: Record<string, LanguagePatterns> = {
  javascript: {
    error: /^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError):\s*/i,
    frame: /^\s+at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/,
    frameAlternative: /^\s+at\s+(.+?):(\d+):(\d+)$/,
  },
  python: {
    error: /^(Traceback \(most recent call last\):|.*Error:|.*Exception:)/i,
    frame: /^\s+File "(.+?)", line (\d+), in (.+)$/,
    frameAlt: /^\s+File "(.+?)", line (\d+)$/,
  },
  java: {
    error: /^(Exception|Error|Caused by:|Suppressed:)/i,
    frame: /^\s+at\s+([^(]+)\(([^:]+):(\d+)\)$/,
    frameNative: /^\s+at\s+([^(]+)\(Native Method\)$/,
    frameUnknown: /^\s+at\s+([^(]+)\(Unknown Source\)$/,
  },
  csharp: {
    error: /^(Exception|Error|at)/i,
    frame: /^\s+at\s+(.+?)\s+in\s+(.+?):line\s+(\d+)$/,
    frameAlt: /^\s+at\s+(.+?)\((.+?),\s*(\d+)\)$/,
  },
  go: {
    error: /^(panic:|fatal error:)/i,
    frame: /^(\S+?)\s+([^:]+):(\d+)/,
  },
  php: {
    error: /^(PHP (Fatal error|Warning|Notice)|Uncaught (Error|Exception|Throwable):)/i,
    frame: /^#\d+\s+(.+?)\((\d+):\s*(.+?)\)$/,
    frameAlt: /^#\d+\s+(.+?):(\d+)/,
  },
  ruby: {
    error: /^(.*Error|.*Exception|RuntimeError)/i,
    frame: /^\s+from\s+(.+?):(\d+):in\s+`(.+?)'$/,
    frameAlt: /^\s+from\s+(.+?):(\d+)$/,
  },
};

export function detectLanguage(trace: string): Language {
  const normalized = trace.trim();

  if (/Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError/i.test(normalized)) {
    if (/\s+at\s+/.test(normalized)) {
      return 'javascript';
    }
  }

  if (/Traceback \(most recent call last\):|File ".*", line \d+, in/.test(normalized)) {
    return 'python';
  }

  if (/Exception in thread|at\s+[\w.]+\(|Caused by:/i.test(normalized)) {
    return 'java';
  }

  if (/\s+in\s+.*:\s*line\s+\d+|at\s+.*\(.*:\d+\)/.test(normalized)) {
    return 'csharp';
  }

  if (/goroutine\s+\d+\s+\[running\]:|panic:/.test(normalized)) {
    return 'go';
  }

  if (/Stack trace:|#\d+\s+.*\(\d+:/.test(normalized)) {
    return 'php';
  }

  if (/from\s+.*:\d+:in\s+`/.test(normalized)) {
    return 'ruby';
  }

  return 'unknown';
}

export function formatStackTrace(trace: string, options: FormatOptions): FormatResult {
  if (!trace.trim()) {
    return {
      success: false,
      error: 'Input is empty',
    };
  }

  const language = options.language === 'unknown' ? detectLanguage(trace) : options.language;
  const lines = trace.split('\n');
  const processedLines: StacktraceLine[] = [];
  let currentIndent = 0;

  for (const line of lines) {
    const processed = processLine(line, language, currentIndent);
    processedLines.push(processed);

    if (processed.isError) {
      currentIndent = 0;
    } else if (processed.formatted.trim()) {
      currentIndent = 2;
    }
  }

  let output = processedLines
    .map(l => ' '.repeat(l.indent) + l.formatted)
    .join('\n');

  if (options.removeSensitiveData) {
    output = anonymizeStackTrace(output);
  }

  return {
    success: true,
    output,
    detectedLanguage: language,
  };
}

function processLine(line: string, language: Language, currentIndent: number): StacktraceLine {
  const trimmed = line.trim();

  if (!trimmed) {
    return {
      original: line,
      formatted: '',
      indent: 0,
      isError: false,
    };
  }

  const patterns = LANGUAGE_PATTERNS[language];

  if (patterns && patterns.error.test(trimmed)) {
    return {
      original: line,
      formatted: trimmed,
      indent: 0,
      isError: true,
    };
  }

  let filePath: string | undefined;
  let lineNumber: string | undefined;
  let functionName: string | undefined;

  if (patterns && patterns.frame) {
    const match = trimmed.match(patterns.frame);
    if (match && match[1] && match[2] && match[3]) {
      functionName = match[1];
      filePath = match[2];
      lineNumber = match[3];
    } else if (patterns.frameAlternative) {
      const altMatch = trimmed.match(patterns.frameAlternative);
      if (altMatch && altMatch[1] && altMatch[2] && altMatch[3]) {
        functionName = altMatch[1];
        filePath = altMatch[2];
        lineNumber = altMatch[3];
      }
    }
  }

  return {
    original: line,
    formatted: trimmed,
    indent: currentIndent || 0,
    isError: false,
    filePath,
    lineNumber,
    functionName,
  };
}

export function anonymizeStackTrace(trace: string): string {
  return trace
    .replace(/\/[Uu]sers\/[^\/]+/g, '...')
    .replace(/\/home\/[^\/]+/g, '~')
    .replace(/\/Users\/[^\/]+/g, '...')
    .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\...')
    .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\...')
    .replace(/\/private\/var\/folders\/[^\/]+/g, '...')
    .replace(/C:\\Documents and Settings\\[^\\]+/g, 'C:\\Documents and Settings\\...');
}

export function highlightStackTrace(trace: string, language: Language): HighlightedPart[] {
  const lines = trace.split('\n');
  const result: HighlightedPart[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      result.push({ text: line, type: 'normal' });
      continue;
    }

    const patterns = LANGUAGE_PATTERNS[language];

    if (patterns?.error.test(trimmed)) {
      const errorMatch = trimmed.match(/^(Error|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError|Exception|Traceback|panic|Fatal|PHP (?:Fatal error|Warning|Notice)|Uncaught Error):(.*)/i);

      if (errorMatch && errorMatch[0]) {
        const prefixLength = errorMatch[0].length - (errorMatch[2] || '').length;
        result.push({ text: line.substring(0, prefixLength), type: 'error' });
        result.push({ text: errorMatch[2] || '', type: 'normal' });
        if (i < lines.length - 1) {
          result.push({ text: '\n', type: 'normal' });
        }
        continue;
      }

      result.push({ text: line, type: 'error' });
    } else if (patterns?.frame) {
      let remaining = line;

      if (patterns.frame.test(trimmed)) {
        const match = trimmed.match(patterns.frame);
        if (match) {
          const indent = line.substring(0, line.indexOf(trimmed));
          result.push({ text: indent, type: 'normal' });

          const functionNameMatch = trimmed.match(/^(\s+at\s+)(.+?)\s+/);
          if (functionNameMatch && functionNameMatch[1] && functionNameMatch[2]) {
            result.push({ text: functionNameMatch[1], type: 'normal' });
            result.push({ text: functionNameMatch[2], type: 'functionName' });
            remaining = trimmed.substring(functionNameMatch[0].length);
          }

          const filePathMatch = remaining.match(/^\((.+?):(\d+):\d+\)$/);
          if (filePathMatch && filePathMatch[1] && filePathMatch[2]) {
            result.push({ text: '(', type: 'normal' });
            result.push({ text: filePathMatch[1], type: 'filePath' });
            result.push({ text: ':', type: 'normal' });
            result.push({ text: filePathMatch[2], type: 'lineNumber' });
            result.push({ text: remaining.substring(filePathMatch[0].length), type: 'normal' });
          } else {
            result.push({ text: remaining, type: 'normal' });
          }
        }
      } else {
        result.push({ text: line, type: 'normal' });
      }
    } else {
      result.push({ text: line, type: 'normal' });
    }

    if (i < lines.length - 1) {
      result.push({ text: '\n', type: 'normal' });
    }
  }

  return result;
}

export function generateSampleTrace(language: Language): string {
  const samples: Record<Language, string> = {
    javascript: `Error: User not found
    at Object.getUser (/app/src/services/userService.js:45:12)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async /app/src/controllers/userController.js:23:18
    at async /app/src/middleware/auth.js:15:22`,

    python: `Traceback (most recent call last):
  File "/app/main.py", line 42, in <module>
    user = get_user(user_id)
  File "/app/services/user_service.py", line 28, in get_user
    raise ValueError("User not found")
ValueError: User not found`,

    java: `Exception in thread "main" java.lang.NullPointerException
    at com.example.UserService.getUserById(UserService.java:45)
    at com.example.Main.main(Main.java:23)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
    at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
Caused by: java.lang.IllegalArgumentException: Invalid user ID
    at com.example.UserService.validateId(UserService.java:32)`,

    csharp: `System.NullReferenceException: Object reference not set to an instance of an object.
   at UserService.GetUserById(Int32 userId) in C:\\Projects\\App\\Services\\UserService.cs:45
   at Program.Main(String[] args) in C:\\Projects\\App\\Program.cs:23
   at Program.<Main>(String[] args)`,

    go: `panic: runtime error: invalid memory address or nil pointer dereference

[signal SIGSEGV: segmentation violation code=0x1 addr=0x8 pc=0x45a3b2]

goroutine 1 [running]:
main.GetUserById(0x0, 0x0)
    /app/main.go:45 +0x52
main.main()
    /app/main.go:23 +0x4a`,

    php: `PHP Fatal error:  Uncaught TypeError: Argument 1 passed to UserService::getUserById() must be of the type int, string given
Stack trace:
#0 /app/index.php(23): UserService->getUserById('invalid')
#1 {main}
  thrown in /app/services/UserService.php on line 45`,

    ruby: `RuntimeError: User not found
    from /app/services/user_service.rb:28:in 'get_user'
    from /app/controllers/user_controller.rb:23:in 'show'
    from /app/middleware/auth.rb:15:in 'authenticate'`,

    unknown: `Error: Unknown error occurred
    at unknown location
    caused by: something went wrong`,
  };

  return samples[language] || samples.javascript;
}

export function validateStackTrace(trace: string): { isValid: boolean; error?: string; suggestion?: string } {
  if (!trace.trim()) {
    return {
      isValid: false,
      error: 'Input is empty',
      suggestion: 'Please paste a stack trace to format',
    };
  }

  const language = detectLanguage(trace);

  if (language === 'unknown') {
    return {
      isValid: false,
      error: 'Could not detect stack trace format',
      suggestion: 'The input does not match known stack trace patterns. Supported languages: JavaScript, Python, Java, C#, Go, PHP, Ruby',
    };
  }

  return {
    isValid: true,
  };
}

export function getLanguageName(language: Language): string {
  const names: Record<Language, string> = {
    javascript: 'JavaScript/Node.js',
    python: 'Python',
    java: 'Java',
    csharp: 'C#',
    go: 'Go',
    php: 'PHP',
    ruby: 'Ruby',
    unknown: 'Unknown',
  };

  return names[language];
}
