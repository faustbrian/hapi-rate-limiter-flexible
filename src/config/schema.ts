import Joi from "@hapi/validate";

export const configSchema = Joi.object({
	enabled: Joi.boolean().default(true),
	points: Joi.number().default(100),
	duration: Joi.number().default(60000),
	whitelist: Joi.array().items(Joi.string().ip()),
	blacklist: Joi.array().items(Joi.string().ip()),
});
