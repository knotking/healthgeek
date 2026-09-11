import { NextResponse } from 'next/server';

import { hashPassword, startSession } from '@/lib/server/auth';
import { createUser, StoreError } from '@/lib/server/store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = (await request.json()) as { email?: unknown; password?: unknown });
  } catch {
    return NextResponse.json({ error: { message: 'Request body must be JSON.' } }, { status: 400 });
  }

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json(
      { error: { code: 'invalid-email', message: 'Please enter a valid email address.' } },
      { status: 400 }
    );
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: { code: 'weak-password', message: 'Password must be at least 6 characters.' } },
      { status: 400 }
    );
  }

  try {
    const { hash, salt } = await hashPassword(password);
    const user = await createUser({ email, passwordHash: hash, passwordSalt: salt });
    await startSession(user.uid, user.email);
    return NextResponse.json({ user: { uid: user.uid, email: user.email } });
  } catch (error: unknown) {
    if (error instanceof StoreError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.code === 'email-already-in-use' ? 409 : 400 }
      );
    }
    console.error('[api/auth/signup] unexpected failure', error);
    return NextResponse.json(
      { error: { message: 'Could not create the account.' } },
      { status: 500 }
    );
  }
}
