'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Google Analytics tracker component
 * Sends pageview events on route changes
 */
function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Check if gtag is available (it should be loaded from layout)
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      // Send pageview event to Google Analytics
      window.gtag('config', 'G-M9WYKE9S07', {
        page_path: pathname,
      });
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

export default Analytics;
