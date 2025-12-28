import type { Metadata } from 'next';
import FillMask from '../../../components/tools/FillMask/FillMask';

export const metadata: Metadata = {
  title: 'Fill-Mask Text Completion - AI Word Prediction Tool',
  description: 'Free AI-powered fill-mask and text completion tool. Predict missing words, complete sentences, and get intelligent word suggestions in context. Perfect for writing assistance, fixing typos, and text completion. Runs locally in your browser.',
  keywords: 'fill mask, text completion, word prediction, AI writing assistant, sentence completion, masked language model, BERT, text suggestion, NLP, transformers.js',
  openGraph: {
    url: 'https://developers.do/tools/fill-mask',
    title: 'Fill-Mask Text Completion - Free AI Tool',
    description: 'Complete sentences and predict missing words using AI. Get intelligent suggestions in context.',
    images: [{ url: 'https://developers.do/favicon.png' }],
  },
};

export default function FillMaskPage() {
  return <FillMask />;
}
