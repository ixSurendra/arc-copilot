import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType<'http' | 'rpc'>();

    if (type === 'rpc') {
      return this.handleRpc(exception);
    }

    return this.handleHttp(exception, host);
  }

  private handleHttp(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).requestId ?? request.headers?.['x-request-id'],
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        body['error'] = r['error'] ?? exception.name;
        body['message'] = r['message'] ?? exception.message;
        if (Array.isArray(r['message'])) {
          body['details'] = r['message'];
          body['message'] = 'Validation failed';
        }
      } else {
        body['message'] = res;
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'statusCode' in exception
    ) {
      // RPC error objects from inter-service TCP calls
      const rpcErr = exception as Record<string, unknown>;
      const rpcStatus =
        typeof rpcErr['statusCode'] === 'number'
          ? rpcErr['statusCode']
          : status;
      body['statusCode'] = rpcStatus;
      body['message'] = rpcErr['message'] ?? 'Internal server error';
      this.logger.error(
        `RPC error on ${request.method} ${request.url}`,
        JSON.stringify(rpcErr),
      );
      response.status(rpcStatus as number).json(body);
      return;
    } else {
      body['message'] = 'Internal server error';
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private handleRpc(exception: unknown) {
    if (exception instanceof RpcException) {
      throw exception;
    }

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'object' && res !== null
          ? (res as Record<string, unknown>)['message'] ?? exception.message
          : res;
      throw new RpcException({ statusCode: exception.getStatus(), message });
    }

    this.logger.error(
      'Unhandled RPC exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    throw new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
