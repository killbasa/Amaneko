import { z } from 'zod';

export const ClientConfigSchema = z
	.object({
		isDev: z.boolean(),
		discord: z.object({
			token: z.string(),
			id: z.string()
		}),
		holodex: z.object({
			apiKey: z.string()
		}),
		database: z.object({
			url: z.string()
		}),
		redis: z.object({
			host: z.string(),
			port: z.number(),
			password: z.string()
		}),
		youtube: z.object({
			apikey: z.string()
		})
	})
	.strict();

export const NodeEnv = z.enum(['dev', 'production', 'test']);

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
