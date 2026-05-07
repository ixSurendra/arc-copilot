import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  ON_PREM: Joi.string().valid('true', 'false').default('false'),
  USERS_SERVICE_PORT: Joi.number().default(3004),
  USERS_SERVICE_HTTP_PORT: Joi.number().default(4004),
});
