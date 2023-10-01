import { NodeEnv } from '#lib/utils/enums';
import { z } from 'zod';

export const ClientConfigSchema = z
	.object({
		env: z.nativeEnum(NodeEnv),
		isDev: z.boolean(),
		enableTasks: z.boolean(),
		discord: z.object({
			token: z.string(),
			id: z.string(),
			devServer: z.string(),
			ownerIds: z.array(z.string())
		}),
		api: z.object({
			port: z.number()
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

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
