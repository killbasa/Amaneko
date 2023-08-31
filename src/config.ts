import { ClientConfigSchema } from '#lib/types/Config';
import { mainFolder } from '#lib/utils/constants';
import { container } from '@sapphire/pieces';
import { config } from 'dotenv';
import { resolve } from 'path';

export function loadConfig(): void {
	process.env.NODE_ENV ??= 'dev';
	config({ path: resolve(mainFolder, '../.env') });

	const clientConfig = ClientConfigSchema.parse({
		isDev: process.env.NODE_ENV !== 'production',
		discord: {
			token: process.env.DISCORD_TOKEN,
			id: process.env.DISCORD_ID
		},
		holodex: {
			apiKey: process.env.HOLODEX_API_KEY
		},
		database: {
			url: process.env.DATABASE_URL
		},
		redis: {
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
			password: process.env.REDIS_PASSWORD
		}
	});

	container.config = clientConfig;
}
