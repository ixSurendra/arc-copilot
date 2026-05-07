import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule, HealthModule, JwtAuthGuard, OnPremLicenseGuard } from '@org/shared';
import { AuthModule } from '../auth/auth.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { MfaModule } from '../mfa/mfa.module';
import { AuthConfigModule } from '../auth-config/auth-config.module';
import { AuthPrismaService } from '../prisma/auth-prisma.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { databaseConfig, jwtConfig, validationSchema } from '../config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule.forRoot({
      prismaServiceClass: AuthPrismaService,
      isGlobal: true,
    }),
    HealthModule.forRootAsync({
      serviceName: 'auth-service',
      prismaClass: AuthPrismaService,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('jwt.secret') ?? '',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiration') ?? '7d') as any,
        },
      }),
    }),
    AuthModule,
    CredentialsModule,
    MfaModule,
    AuthConfigModule,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
