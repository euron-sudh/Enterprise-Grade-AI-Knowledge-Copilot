import { NextResponse } from 'next/server';

/**
 * Returns which OAuth providers have credentials configured.
 * Only exposes boolean flags — never leaks actual secrets.
 */
export async function GET() {
  return NextResponse.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
  });
}
