import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Developer Tools Dashboard',
  description: 'Privacy policy for the Developer Tools Dashboard.',
  openGraph: {
    url: 'https://developers.do/privacy-policy',
    title: 'Privacy Policy - Developer Tools Dashboard',
    description: 'Privacy policy for the Developer Tools Dashboard.',
    images: [{ url: 'https://developers.do/favicon.png' }],
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: March 8, 2025</p>

        <div className="space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Overview</h2>
            <p>
              This website runs entirely in your browser. The tools do not send the content you
              enter to any server. We do not collect or store user-generated data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Analytics</h2>
            <p>
              We use Google Analytics to understand aggregate usage of the site. Google Analytics
              may collect data such as IP address, device information, and usage events through
              cookies or similar technologies. This data is processed by Google in accordance with
              their privacy policy.
            </p>
            <p className="mt-3">
              You can learn more or opt out using Google&apos;s tools:
              {' '}
              <a
                className="text-slate-900 underline"
                href="https://tools.google.com/dlpage/gaoptout"
                rel="noreferrer"
                target="_blank"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Cookies</h2>
            <p>
              Google Analytics may set cookies to measure site usage. The tools themselves do not
              require cookies to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Third-Party Links</h2>
            <p>
              This site may link to third-party resources. We are not responsible for the privacy
              practices of those sites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Changes</h2>
            <p>
              We may update this policy from time to time. Changes will be posted on this page with
              an updated date.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
