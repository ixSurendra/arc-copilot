import { Module } from '@nestjs/common';
import { AuthConfigController } from './auth-config.controller';
import { AuthConfigService } from './auth-config.service';
import { AuthConfigRepository } from './auth-config.repository';

@Module({
  controllers: [AuthConfigController],
  providers: [AuthConfigService, AuthConfigRepository],
  exports: [AuthConfigService],
})
export class AuthConfigModule {}
