import type { Metadata } from 'next';
import CronGenerator from '../../../components/tools/CronGenerator/CronGenerator';

export const metadata: Metadata = {
  title: 'Cron Expression Generator — Build Cron Schedules Visually | DevTools',
  description: 'Generate cron expressions visually with per-field controls. Pick mode (every / every N / specific values / range) for each field — no cron syntax knowledge required. Live plain-English description and timezone-aware next-run preview.',
  keywords: 'cron generator, cron expression generator, crontab generator, visual cron builder, cron builder, cron schedule generator, cron maker, cron expression maker',
  openGraph: {
    url: 'https://developers.do/tools/cron-generator',
    title: 'Cron Expression Generator — Build Cron Schedules Visually | DevTools',
    description: 'Build cron expressions with field-level controls. No syntax knowledge required.',
    images: [{ url: 'https://developers.do/favicon.png' }],
  },
};

export default function CronGeneratorPage() {
  return <CronGenerator />;
}
