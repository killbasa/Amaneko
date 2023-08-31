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
		})
	})
	.strict();

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
