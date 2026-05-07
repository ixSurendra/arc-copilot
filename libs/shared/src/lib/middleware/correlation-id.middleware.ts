import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID middleware.
 * - Reads X-Request-ID from incoming request (set by Nginx/gateway) or generates a new UUID
 * - Attaches it back on the response so clients can trace their requests
 * - Stores on request object for use in logs and error responses
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void): void {
    const existingId = req.headers[REQUEST_ID_HEADER] as string;
    const requestId = existingId || randomUUID();

    // Attach to request for downstream use
    req.requestId = requestId;

    // Echo back on response header
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
