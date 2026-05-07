import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  JWT_SECRET: Joi.string().required(),
  ADMIN_PORTAL_PORT: Joi.number().default(3006),
  ADMIN_PORTAL_HTTP_PORT: Joi.number().default(4006),
  TENANT_SERVICE_HOST: Joi.string().default('localhost'),
  USERS_SERVICE_HOST: Joi.string().default('localhost'),
  LICENSE_SERVICE_HOST: Joi.string().default('localhost'),
  AUTH_SERVICE_HOST: Joi.string().default('localhost'),
  AUDIT_SERVICE_HOST: Joi.string().default('localhost'),
});
