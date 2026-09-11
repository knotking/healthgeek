import { NextResponse } from 'next/server';

import { startSession, verifyPassword } from '@/lib/server/auth';
import { findUserByEmail } from '@/lib/server/store';

const INVALID_CREDENTIALS = {
  error: { code: 'invalid-credential', message: 'Incorrect email or password.' },
};

export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = (await request.json()) as { email?: unknown; password?: unknown });
  } catch {
    return NextResponse.json({ error: { message: 'Request body must be JSON.' } }, { status: 400 });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
  }

  try {
    const user = await findUserByEmail(email);
    // Same response whether the email is unknown or the password is wrong.
    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }
    await startSession(user.uid, user.email);
    return NextResponse.json({ user: { uid: user.uid, email: user.email } });
  } catch (error) {
    console.error('[api/auth/login] unexpected failure', error);
    return NextResponse.json({ error: { message: 'Could not sign in.' } }, { status: 500 });
  }
}
