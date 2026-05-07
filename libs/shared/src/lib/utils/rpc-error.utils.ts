import { HttpStatus } from '@nestjs/common';

/**
 * Extracts a valid HTTP status code from a NestJS RPC error.
 *
 * NestJS microservices serialize exceptions as:
 *   { status: "error", message: "...", error: { statusCode: 409, message: "..." } }
 *
 * The top-level `status` is the literal string "error", NOT a number.
 * This helper safely extracts the real numeric status code.
 */
export function rpcStatusCode(err: unknown): number {
  const e = err as Record<string, unknown>;

  // Try error.statusCode first (nested error object from NestJS exception serialization)
  const nested = e?.['error'] as Record<string, unknown> | undefined;
  const candidates = [
    nested?.['statusCode'],
    e?.['statusCode'],
    // Do NOT use e?.['status'] — it is the literal string "error" in RPC errors
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n >= 100 && n < 600) return n;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Extracts a human-readable message from an RPC error.
 */
export function rpcMessage(err: unknown, fallback: string): string {
  const e = err as Record<string, unknown>;
  const nested = e?.['error'] as Record<string, unknown> | undefined;
  return (
    (typeof nested?.['message'] === 'string' ? nested['message'] : undefined) ||
    (typeof e?.['message'] === 'string' ? e['message'] : undefined) ||
    fallback
  );
}
