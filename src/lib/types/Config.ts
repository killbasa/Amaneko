import { z } from 'zod';

export const ClientConfigSchema = z
	.object({
		isDev: z.boolean(),
		enableTasks: z.boolean(),
		discord: z.object({
			token: z.string(),
			id: z.string(),
			devServer: z.string(),
			ownerIds: z.array(z.string())
		}),
		holodex: z.object({
			apiKey: z.string()
		}),
		youtube: z.object({
			apikey: z.string()
		}),
		database: z.object({
			url: z.string()
		}),
		redis: z.object({
			host: z.string(),
			port: z.number(),
			password: z.string()
		}),
		meili: z.object({
			host: z.string(),
			port: z.number()
		})
	})
	.strict();

export const NodeEnv = z.enum(['dev', 'production', 'staging', 'test']);

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
