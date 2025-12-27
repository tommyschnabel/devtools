/**
 * Lorem Ipsum text generation utilities
 */

const LOREM_IPSUM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur',
  'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui',
  'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'semper',
  'quis', 'lectus', 'nulla', 'at', 'volutpat', 'diam', 'maecenas', 'ultricies',
  'mi', 'eget', 'mauris', 'pharetra', 'odio', 'facilisis', 'gravida', 'neque',
  'convallis', 'posuere', 'morbi', 'leo', 'urna', 'molestie', 'a', 'iaculis',
  'proin', 'faucibus', 'nisl', 'tincidunt', 'eget', 'nullam', 'aliquet',
  'porttitor', 'lacus', 'luctus', 'accumsan', 'tortor', 'risus', 'viverra',
  'adipiscing', 'varius', 'vel', 'turpis', 'nunc', 'egestas', 'congue',
  'quisque', 'integer', 'feugiat', 'scelerisque', 'varius', 'morbi', 'enim',
  'nunc', 'faucibus', 'pulvinar', 'elementum', 'integer', 'enim', 'neque',
];

export type LengthUnit = 'paragraphs' | 'sentences' | 'words';

export interface LoremIpsumOptions {
  count: number;
  unit: LengthUnit;
  startWithLorem?: boolean;
}

/**
 * Generate lorem ipsum text
 */
export function generateLoremIpsum(options: LoremIpsumOptions): string {
  const { count, unit, startWithLorem = true } = options;

  switch (unit) {
    case 'paragraphs':
      return generateParagraphs(count, startWithLorem);
    case 'sentences':
      return generateSentences(count, startWithLorem);
    case 'words':
      return generateWords(count, startWithLorem);
    default:
      return '';
  }
}

/**
 * Generate random words
 */
function generateWords(count: number, startWithLorem: boolean): string {
  const words: string[] = [];

  // Always start with "Lorem ipsum" if requested
  if (startWithLorem) {
    words.push('Lorem', 'ipsum');
  }

  while (words.length < count) {
    const randomWord = LOREM_IPSUM_WORDS[Math.floor(Math.random() * LOREM_IPSUM_WORDS.length)];
    words.push(randomWord!);
  }

  // Capitalize first word
  if (words.length > 0) {
    words[0] = words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1);
  }

  return words.slice(0, count).join(' ') + '.';
}

/**
 * Generate random sentences
 */
function generateSentences(count: number, startWithLorem: boolean): string {
  const sentences: string[] = [];

  for (let i = 0; i < count; i++) {
    const sentenceLength = Math.floor(Math.random() * 10) + 5; // 5-15 words per sentence
    const isFirstSentence = i === 0 && startWithLorem;
    const sentence = generateWords(sentenceLength, isFirstSentence);
    sentences.push(sentence);
  }

  return sentences.join(' ');
}

/**
 * Generate random paragraphs
 */
function generateParagraphs(count: number, startWithLorem: boolean): string {
  const paragraphs: string[] = [];

  for (let i = 0; i < count; i++) {
    const sentenceCount = Math.floor(Math.random() * 5) + 3; // 3-8 sentences per paragraph
    const isFirstParagraph = i === 0 && startWithLorem;
    const paragraph = generateSentences(sentenceCount, isFirstParagraph);
    paragraphs.push(paragraph);
  }

  return paragraphs.join('\n\n');
}
