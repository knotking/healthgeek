import { NextResponse } from 'next/server';

import { currentSession } from '@/lib/server/auth';

/** Returns the signed-in user, or `{ user: null }` when there is no session. */
export async function GET() {
  const session = await currentSession();
  return NextResponse.json({
    user: session ? { uid: session.uid, email: session.email } : null,
  });
}
