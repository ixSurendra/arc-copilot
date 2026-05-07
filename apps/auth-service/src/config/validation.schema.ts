import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),
  AUTH_SERVICE_PORT: Joi.number().default(5001),
  AUTH_SERVICE_HTTP_PORT: Joi.number().default(6001),
});
