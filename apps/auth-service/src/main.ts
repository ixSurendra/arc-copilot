import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { AUTH_SERVICE_PORT, AUTH_SERVICE_HTTP_PORT, setupSwagger, AllExceptionsFilter, CorrelationIdMiddleware } from '@arc/shared';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const correlationMiddleware = new CorrelationIdMiddleware();
  app.use(correlationMiddleware.use.bind(correlationMiddleware));

  await setupSwagger(app, {
    title: 'Auth Service',
    description: 'API for authentication, credentials, MFA, and auth configuration',
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: AUTH_SERVICE_PORT,
    },
  });

  await app.startAllMicroservices();
  await app.listen(AUTH_SERVICE_HTTP_PORT);

  Logger.log(`Auth service TCP on port ${AUTH_SERVICE_PORT}`);
  Logger.log(
    `Auth service HTTP on http://localhost:${AUTH_SERVICE_HTTP_PORT}`,
  );
}

bootstrap();
