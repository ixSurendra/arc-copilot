import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, HealthModule, JwtAuthGuard, OnPremLicenseGuard } from '@org/shared';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { GroupsModule } from '../groups/groups.module';
import { ModulesModule } from '../modules/modules.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersPrismaService } from '../prisma/users-prisma.service';
import { databaseConfig, validationSchema } from '../config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule.forRoot({
      prismaServiceClass: UsersPrismaService,
      isGlobal: true,
    }),
    HealthModule.forRootAsync({
      serviceName: 'users-service',
      prismaClass: UsersPrismaService,
    }),
    UsersModule,
    RolesModule,
    GroupsModule,
    ModulesModule,
    PermissionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OnPremLicenseGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
