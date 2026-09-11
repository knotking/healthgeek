import { NextResponse } from 'next/server';

import type { QueryConstraint } from '@/lib/data/query';
import {
  assertDocumentAccess,
  assertOwnsStoredDoc,
  assertWritePayload,
  forbidden,
  OWNED_COLLECTIONS,
  scopeQueryConstraints,
} from '@/lib/server/access';
import { currentSession } from '@/lib/server/auth';
import {
  addDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  setDocument,
  StoreError,
  updateDocument,
} from '@/lib/server/store';

/**
 * The single data endpoint the browser talks to.
 *
 * Every request is authenticated from the session cookie and authorized against
 * the rules in `lib/server/access.ts` before it reaches the store.
 */

type Body = {
  op: 'getDoc' | 'setDoc' | 'addDoc' | 'updateDoc' | 'deleteDoc' | 'getDocs';
  collection?: unknown;
  id?: unknown;
  data?: unknown;
  merge?: unknown;
  constraints?: unknown;
};

function statusFor(code: string): number {
  switch (code) {
    case 'permission-denied':
      return 403;
    case 'not-found':
      return 404;
    case 'invalid-argument':
      return 400;
    default:
      return 500;
  }
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new StoreError('invalid-argument', `"${name}" is required.`);
  }
  return value;
}

function requireData(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new StoreError('invalid-argument', '"data" must be an object.');
  }
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: { code: 'unauthenticated', message: 'Sign in first.' } }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid-argument', message: 'Request body must be JSON.' } },
      { status: 400 }
    );
  }

  const uid = session.uid;

  try {
    switch (body.op) {
      case 'getDoc': {
        const collection = requireString(body.collection, 'collection');
        const id = requireString(body.id, 'id');
        assertDocumentAccess(collection, id, uid);
        const found = await getDocument(collection, id);
        assertOwnsStoredDoc(collection, found?.data, uid);
        return NextResponse.json({ doc: found });
      }

      case 'setDoc': {
        const collection = requireString(body.collection, 'collection');
        const id = requireString(body.id, 'id');
        const data = requireData(body.data);
        assertDocumentAccess(collection, id, uid);
        assertWritePayload(collection, data, uid);
        const existing = await getDocument(collection, id);
        assertOwnsStoredDoc(collection, existing?.data, uid);
        await setDocument(collection, id, data, body.merge === true);
        return NextResponse.json({ id });
      }

      case 'addDoc': {
        const collection = requireString(body.collection, 'collection');
        const data = requireData(body.data);
        if (!OWNED_COLLECTIONS.has(collection)) {
          forbidden(`Documents in "${collection}" must be written by id.`);
        }
        assertWritePayload(collection, data, uid);
        const created = await addDocument(collection, { ...data, userId: uid });
        return NextResponse.json({ id: created.id });
      }

      case 'updateDoc': {
        const collection = requireString(body.collection, 'collection');
        const id = requireString(body.id, 'id');
        const data = requireData(body.data);
        assertDocumentAccess(collection, id, uid);
        assertWritePayload(collection, data, uid);
        const existing = await getDocument(collection, id);
        if (!existing) throw new StoreError('not-found', `No document at ${collection}/${id}.`);
        assertOwnsStoredDoc(collection, existing.data, uid);
        await updateDocument(collection, id, data);
        return NextResponse.json({ id });
      }

      case 'deleteDoc': {
        const collection = requireString(body.collection, 'collection');
        const id = requireString(body.id, 'id');
        assertDocumentAccess(collection, id, uid);
        const existing = await getDocument(collection, id);
        assertOwnsStoredDoc(collection, existing?.data, uid);
        await deleteDocument(collection, id);
        return NextResponse.json({ id });
      }

      case 'getDocs': {
        const collection = requireString(body.collection, 'collection');
        const constraints = Array.isArray(body.constraints)
          ? (body.constraints as QueryConstraint[])
          : [];
        const docs = await queryDocuments({
          collection,
          constraints: scopeQueryConstraints(collection, constraints, uid),
        });
        return NextResponse.json({ docs });
      }

      default:
        return NextResponse.json(
          { error: { code: 'invalid-argument', message: `Unsupported operation "${String(body.op)}".` } },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    if (error instanceof StoreError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: statusFor(error.code) }
      );
    }
    console.error('[api/db] unexpected failure', error);
    return NextResponse.json(
      { error: { code: 'internal', message: 'The data store failed to handle the request.' } },
      { status: 500 }
    );
  }
}
