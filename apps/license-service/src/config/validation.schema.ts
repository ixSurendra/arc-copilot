import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  LICENSE_SERVICE_PORT: Joi.number().default(3005),
  LICENSE_SERVICE_HTTP_PORT: Joi.number().default(4005),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  ON_PREM: Joi.string().valid('true', 'false').default('false'),
  ONPREM_LICENSE_PRIVATE_KEY: Joi.string().optional(),
  ONPREM_LICENSE_PUBLIC_KEY: Joi.string().optional(),
  LICENSE_FILE_PATH: Joi.string().optional(),
});
