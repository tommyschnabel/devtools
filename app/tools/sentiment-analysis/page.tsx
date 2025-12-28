import type { Metadata } from 'next';
import SentimentAnalysis from '../../../components/tools/SentimentAnalysis/SentimentAnalysis';

export const metadata: Metadata = {
  title: 'Sentiment Analysis - Free Online AI Tool | DevTools',
  description: 'Analyze the emotional tone of text using lexicon-based or AI-powered sentiment analysis. Detect positive, negative, or neutral sentiment in reviews, feedback, and social media posts. Privacy-focused, runs entirely in your browser.',
  keywords: [
    'sentiment analysis',
    'emotion detection',
    'text analysis',
    'AI sentiment',
    'positive negative neutral',
    'review analysis',
    'feedback analysis',
    'NLP',
    'natural language processing',
    'transformers.js',
    'BERT model',
    'client-side AI',
  ],
};

export default function SentimentAnalysisPage() {
  return <SentimentAnalysis />;
}
