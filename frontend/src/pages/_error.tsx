// Minimal Pages Router error page.
// Real error handling is in src/app/error.tsx (App Router).
// This file only exists to prevent `next build` from failing when it
// tries to statically prerender the built-in /_error route.
type Props = { statusCode?: number };

export default function Error({ statusCode }: Props) {
  return null;
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode?: number }; err?: { statusCode?: number } }) => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 404,
});
