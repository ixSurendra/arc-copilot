import { HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError, TimeoutError } from 'rxjs';

/**
 * Sends a TCP microservice request with a configurable timeout.
 * Throws Gateway Timeout (504) if the service doesn't respond in time.
 * Throws the original error for all other failures.
 *
 * @param client - NestJS ClientProxy (TCP transport)
 * @param pattern - Message pattern e.g. { cmd: 'get_user' }
 * @param data - Payload to send
 * @param timeoutMs - Timeout in ms (default: 5000)
 */
export async function sendWithTimeout<T>(
  client: ClientProxy,
  pattern: Record<string, unknown>,
  data: unknown,
  timeoutMs = 5000,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, data).pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new HttpException(
                `Downstream service did not respond within ${timeoutMs}ms`,
                HttpStatus.GATEWAY_TIMEOUT,
              ),
          );
        }
        return throwError(() => err);
      }),
    ),
  );
}
