import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OnPremGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.configService.get<string>('ON_PREM') !== 'true') {
      throw new ForbiddenException('This endpoint is only available in on-premise deployments');
    }
    return true;
  }
}
