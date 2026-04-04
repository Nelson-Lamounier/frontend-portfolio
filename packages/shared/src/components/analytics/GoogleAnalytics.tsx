/** @format */

'use client';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Google Analytics 4 (GA4) integration component
 *
 * Injects the gtag.js script and initializes GA4 tracking.
 * Only renders when NEXT_PUBLIC_GA_MEASUREMENT_ID is set,
 * so it's a no-op in environments without the env var.
 *
 * Usage: Add <GoogleAnalytics /> to your root layout.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </script>
    </>
  );
}
