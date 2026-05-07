import { Module } from '@nestjs/common';
import { BffAuthController } from './auth.controller';
import { BffAuthService } from './auth.service';

@Module({
  controllers: [BffAuthController],
  providers: [BffAuthService],
})
export class BffAuthModule {}
