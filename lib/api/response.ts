import { NextResponse } from 'next/server';

// Every API route answers with one of these two shapes:
//   { ok: true,  data: ... }
//   { ok: false, error: { code, message, details? } }

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ ok: true, data }, { status });

export const fail = (
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) =>
  NextResponse.json(
    { ok: false, error: { code, message, ...(details !== undefined && { details }) } },
    { status },
  );

// Logs the real error on the server; the client only gets a generic message.
export const internalError = (scope: string, error: unknown) => {
  console.error(`[${scope}]`, error);
  return fail(500, 'INTERNAL_ERROR', 'Váratlan szerverhiba történt.');
};
