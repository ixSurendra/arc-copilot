import { Logger } from '@nestjs/common';

export interface SwaggerOptions {
  title: string;
  description: string;
  version?: string;
  path?: string;
}

/**
 * Sets up Swagger UI for the given NestJS app.
 * No-ops in production — uses dynamic import to keep @nestjs/swagger
 * out of the production bundle entirely.
 *
 * Accepts `any` to avoid pnpm phantom type mismatches across packages
 * that resolve separate copies of @nestjs/common.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setupSwagger(
  app: any,
  options: SwaggerOptions,
): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') return;

  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const path = options.path ?? 'api';

  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version ?? '1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(path, app, document);

  Logger.log(`Swagger UI at ${path}`, 'SwaggerModule');
}
