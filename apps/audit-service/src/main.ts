import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { AUDIT_SERVICE_PORT, AUDIT_SERVICE_HTTP_PORT, setupSwagger, AllExceptionsFilter, CorrelationIdMiddleware } from '@org/shared';
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
    title: 'Audit Service',
    description: 'API for querying and managing audit logs',
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: AUDIT_SERVICE_PORT,
    },
  });

  await app.startAllMicroservices();
  await app.listen(AUDIT_SERVICE_HTTP_PORT);

  Logger.log(`Audit service TCP on port ${AUDIT_SERVICE_PORT}`);
  Logger.log(
    `Audit service HTTP on http://localhost:${AUDIT_SERVICE_HTTP_PORT}`,
  );
}

bootstrap();
