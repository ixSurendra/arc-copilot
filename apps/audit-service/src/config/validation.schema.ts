import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  AUDIT_SERVICE_PORT: Joi.number().default(3002),
  AUDIT_SERVICE_HTTP_PORT: Joi.number().default(4002),
});
