import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';
import { LICENSE_SERVICE_PORT, LICENSE_SERVICE_HTTP_PORT, setupSwagger, AllExceptionsFilter, CorrelationIdMiddleware } from '@org/shared';
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
    title: 'License Service',
    description: 'API for managing plans, features, quotas, pricing, and usage metering',
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: LICENSE_SERVICE_PORT,
    },
  });

  await app.startAllMicroservices();
  await app.listen(LICENSE_SERVICE_HTTP_PORT);

  Logger.log(`License service TCP on port ${LICENSE_SERVICE_PORT}`);
  Logger.log(
    `License service HTTP on http://localhost:${LICENSE_SERVICE_HTTP_PORT}`,
  );
}

bootstrap();
