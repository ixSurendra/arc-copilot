import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { PUBLIC_ROUTES_KEY } from './auth.constants';

interface JwtPayload {
  sub: number;
  email: string;
  tenantId: number;
  roles: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for non-HTTP contexts (TCP message patterns)
    if (context.getType() !== 'http') {
      return true;
    }

    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;

    // Whitelist health endpoints
    if (path === '/health' || path === '/api/health') {
      return true;
    }

    // Allow service-to-service calls via x-internal-api-key (validated by downstream guards)
    const apiKey = request.headers['x-internal-api-key'];
    if (apiKey) {
      const internalKey =
        this.configService.get<string>('INTERNAL_API_KEY') ||
        this.configService.get<string>('JWT_SECRET') ||
        'internal-service-key';
      if (apiKey === internalKey) {
        return true;
      }
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    try {
      const payload = jwt.verify(token, secret) as unknown as JwtPayload;
      request.user = {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles || [],
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
