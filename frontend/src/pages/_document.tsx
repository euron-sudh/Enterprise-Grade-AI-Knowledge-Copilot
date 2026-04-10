import { Html, Head, Main, NextScript } from 'next/document';

// Required by Next.js for Pages Router error pages (/_error → /404, /500).
// App Router pages use src/app/ — this file only exists to satisfy the
// <Html> import restriction during `next build` static prerendering.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
