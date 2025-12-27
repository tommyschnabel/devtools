import type { Metadata } from 'next';
import JsonToSwift from '../../../components/tools/JsonToSwift/JsonToSwift';

export const metadata: Metadata = {
  title: 'JSON to Swift - Convert JSON to Swift Structs',
  description: 'Free JSON to Swift converter with syntax highlighting. Generate Swift Codable structs from JSON objects. Supports optional property detection, nested structs, and Swift naming conventions.',
  keywords: 'json to swift, swift struct generator, json converter, generate swift, codable swift, json to struct, swift code generator',
  openGraph: {
    url: 'https://developers.do/tools/json-to-swift',
    title: 'JSON to Swift - Free Codable Struct Generator',
    description: 'Convert JSON to Swift Codable structs instantly. Supports optional properties and nested objects. Free JSON to Swift converter.',
    images: [{ url: 'https://developers.do/favicon.png' }],
  },
};

export default function JsonToSwiftPage() {
  return <JsonToSwift />;
}
