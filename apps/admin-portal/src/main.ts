import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { ADMIN_PORTAL_PORT, ADMIN_PORTAL_HTTP_PORT, setupSwagger, AllExceptionsFilter, CorrelationIdMiddleware } from '@arc/shared';
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
    title: 'Admin Portal',
    description: 'BFF API for the admin dashboard — aggregates all microservices',
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: ADMIN_PORTAL_PORT,
    },
  });

  await app.startAllMicroservices();
  await app.listen(ADMIN_PORTAL_HTTP_PORT);

  Logger.log(`Admin Portal TCP on port ${ADMIN_PORTAL_PORT}`);
  Logger.log(`Admin Portal HTTP on http://localhost:${ADMIN_PORTAL_HTTP_PORT}`);
}

bootstrap();
