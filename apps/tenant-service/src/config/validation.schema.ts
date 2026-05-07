import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  TENANT_SERVICE_PORT: Joi.number().default(3003),
  TENANT_SERVICE_HTTP_PORT: Joi.number().default(4003),
  USERS_SERVICE_HOST: Joi.string().default('localhost'),
});
