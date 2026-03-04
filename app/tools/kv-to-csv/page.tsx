import type { Metadata } from 'next';
import KvToCsv from '../../../components/tools/KvToCsv/KvToCsv';

export const metadata: Metadata = {
  title: 'KV to CSV Converter - Convert Key-Value Pairs',
  description: 'Convert key=value pairs to CSV format. Supports dotted keys and multiple rows. Perfect for log parsing and data transformation.',
  keywords: 'kv to csv, key value to csv, convert kv pairs, log to csv, key value converter',
  openGraph: {
    url: 'https://developers.do/tools/kv-to-csv',
    title: 'KV to CSV Converter - Convert Key-Value Pairs',
    description: 'Convert key=value pairs to CSV format. Supports dotted keys and multiple rows.',
    images: [{ url: 'https://developers.do/favicon.png' }],
  },
};

export default function KvToCsvPage() {
  return <KvToCsv />;
}
