'use client';

import { useRouter } from 'next/navigation';
import Card from '../components/shared/Card';
import { TOOLS } from '../config/tools';

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Developer Tools Dashboard</h1>
          <p className="text-slate-600 text-lg">A collection of useful utilities for developers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => (
            <Card
              key={tool.id}
              icon={tool.icon}
              title={tool.name}
              description={tool.description}
              onClick={() => router.push(tool.route)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
