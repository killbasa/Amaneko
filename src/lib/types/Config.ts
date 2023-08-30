import { z } from 'zod';

export const ClientConfigSchema = z.object({
	discord: z.object({
		token: z.string(),
		id: z.string()
	})
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
