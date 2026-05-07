import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USERS_SERVICE_PORT, TENANT_SERVICE_PORT } from '@org/shared';
import { AuthController } from './auth.controller';
import { SsoController } from './sso.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('jwt.secret') ?? '',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiration') ?? '7d') as any,
        },
      }),
    }),
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['USERS_SERVICE_HOST'] || 'localhost',
          port: USERS_SERVICE_PORT,
        },
      },
      {
        name: 'TENANT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env['TENANT_SERVICE_HOST'] || 'localhost',
          port: TENANT_SERVICE_PORT,
        },
      },
    ]),
  ],
  controllers: [AuthController, SsoController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService],
})
export class AuthModule {}
