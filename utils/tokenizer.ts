/**
 * Text tokenization utilities using various AI tokenizers
 */

import { encode, decode, encodeChat } from 'gpt-tokenizer';

export type TokenizerType =
  | 'tiktoken-gpt4'
  | 'tiktoken-gpt-3.5-turbo'
  | 'tiktoken-text-davinci-003'
  | 'tiktoken-davinci'
  | 'gpt-tokenizer-gpt4'
  | 'gpt-tokenizer-gpt-3.5-turbo'
  | 'character'
  | 'word'
  | 'sentence';

export interface TokenizationResult {
  success: boolean;
  tokens?: number[];
  tokenCount?: number;
  decodedTokens?: string[];
  error?: string;
}

/**
 * Tokenize text using the specified tokenizer
 */
export async function tokenizeText(
  text: string,
  tokenizerType: TokenizerType
): Promise<TokenizationResult> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Please enter some text to tokenize',
      };
    }

    switch (tokenizerType) {
      case 'tiktoken-gpt4':
        return await tokenizeWithTiktoken(text, 'gpt-4');

      case 'tiktoken-gpt-3.5-turbo':
        return await tokenizeWithTiktoken(text, 'gpt-3.5-turbo');

      case 'tiktoken-text-davinci-003':
        return await tokenizeWithTiktoken(text, 'text-davinci-003');

      case 'tiktoken-davinci':
        return await tokenizeWithTiktoken(text, 'davinci');

      case 'gpt-tokenizer-gpt4':
        return tokenizeWithGPTTokenizer(text, 'gpt-4');

      case 'gpt-tokenizer-gpt-3.5-turbo':
        return tokenizeWithGPTTokenizer(text, 'gpt-3.5-turbo');

      case 'character':
        return tokenizeByCharacter(text);

      case 'word':
        return tokenizeByWord(text);

      case 'sentence':
        return tokenizeBySentence(text);

      default:
        return {
          success: false,
          error: 'Unknown tokenizer type',
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to tokenize text',
    };
  }
}

/**
 * Tokenize using tiktoken library
 */
async function tokenizeWithTiktoken(
  text: string,
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'text-davinci-003' | 'davinci'
): Promise<TokenizationResult> {
  try {
    // Dynamic import to avoid loading WASM during static generation
    const { encoding_for_model } = await import('tiktoken');
    const encoder = encoding_for_model(model);
    const tokens = encoder.encode(text);

    // Decode each token individually to show what each represents
    const decodedTokens = Array.from(tokens).map((token) => {
      const decoded = encoder.decode(new Uint32Array([token]));
      return new TextDecoder().decode(decoded);
    });

    encoder.free();

    return {
      success: true,
      tokens: Array.from(tokens),
      tokenCount: tokens.length,
      decodedTokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tiktoken encoding failed',
    };
  }
}

/**
 * Tokenize using gpt-tokenizer library (pure TypeScript, no WASM)
 */
function tokenizeWithGPTTokenizer(
  text: string,
  model: 'gpt-4' | 'gpt-3.5-turbo'
): TokenizationResult {
  try {
    const tokens = encode(text);

    // Decode each token individually
    const decodedTokens = tokens.map((token) => {
      return decode([token]);
    });

    return {
      success: true,
      tokens,
      tokenCount: tokens.length,
      decodedTokens,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GPT tokenizer encoding failed',
    };
  }
}

/**
 * Tokenize by character (simplest tokenization)
 */
function tokenizeByCharacter(text: string): TokenizationResult {
  const tokens = Array.from(text).map((char) => char.charCodeAt(0));
  const decodedTokens = Array.from(text);

  return {
    success: true,
    tokens,
    tokenCount: tokens.length,
    decodedTokens,
  };
}

/**
 * Tokenize by word (split on whitespace)
 */
function tokenizeByWord(text: string): TokenizationResult {
  const words = text.split(/(\s+|[.,!?;:(){}[\]"'`])/g).filter((w) => w.length > 0);
  const tokens = words.map((word, index) => index);
  const decodedTokens = words;

  return {
    success: true,
    tokens,
    tokenCount: tokens.length,
    decodedTokens,
  };
}

/**
 * Tokenize by sentence (split on sentence boundaries)
 */
function tokenizeBySentence(text: string): TokenizationResult {
  const sentences = text
    .split(/([.!?]+\s+)/)
    .filter((s) => s.trim().length > 0)
    .reduce((acc: string[], curr, index, arr) => {
      if (index % 2 === 0) {
        const next = arr[index + 1] || '';
        acc.push(curr + next);
      }
      return acc;
    }, []);

  const tokens = sentences.map((_, index) => index);
  const decodedTokens = sentences;

  return {
    success: true,
    tokens,
    tokenCount: tokens.length,
    decodedTokens,
  };
}

/**
 * Get available tokenizers with descriptions
 */
export function getAvailableTokenizers(): Array<{ value: TokenizerType; label: string; description: string }> {
  return [
    {
      value: 'tiktoken-gpt4',
      label: 'Tiktoken (GPT-4) [WASM]',
      description: 'OpenAI GPT-4 tokenizer using tiktoken WASM (cl100k_base encoding)',
    },
    {
      value: 'tiktoken-gpt-3.5-turbo',
      label: 'Tiktoken (GPT-3.5 Turbo) [WASM]',
      description: 'OpenAI GPT-3.5 Turbo tokenizer using tiktoken WASM (cl100k_base encoding)',
    },
    {
      value: 'tiktoken-text-davinci-003',
      label: 'Tiktoken (text-davinci-003) [WASM]',
      description: 'OpenAI text-davinci-003 tokenizer using tiktoken WASM (p50k_base encoding)',
    },
    {
      value: 'tiktoken-davinci',
      label: 'Tiktoken (Davinci) [WASM]',
      description: 'OpenAI Davinci tokenizer using tiktoken WASM (r50k_base encoding)',
    },
    {
      value: 'gpt-tokenizer-gpt4',
      label: 'GPT-Tokenizer (GPT-4) [Pure JS]',
      description: 'Pure TypeScript GPT-4 tokenizer (cl100k_base, no WASM required)',
    },
    {
      value: 'gpt-tokenizer-gpt-3.5-turbo',
      label: 'GPT-Tokenizer (GPT-3.5) [Pure JS]',
      description: 'Pure TypeScript GPT-3.5 tokenizer (cl100k_base, no WASM required)',
    },
    {
      value: 'character',
      label: 'Character Tokenizer',
      description: 'Split text into individual characters (simplest tokenization)',
    },
    {
      value: 'word',
      label: 'Word Tokenizer',
      description: 'Split text by whitespace and punctuation into words',
    },
    {
      value: 'sentence',
      label: 'Sentence Tokenizer',
      description: 'Split text into sentences based on punctuation',
    },
  ];
}
