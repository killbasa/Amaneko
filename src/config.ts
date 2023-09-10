import { ClientConfigSchema, NodeEnv } from '#lib/types/Config';
import { mainFolder } from '#lib/utils/constants';
import { container } from '@sapphire/framework';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { ClientConfig } from '#lib/types/Config';
import type { Unvalidated } from '#lib/types/Generic';

export function loadConfig(): void {
	process.env.NODE_ENV ??= NodeEnv.enum.dev;
	config({ path: resolve(mainFolder, '../.env') });

	const rawConfig: Unvalidated<ClientConfig> = {
		isDev: process.env.NODE_ENV !== 'production',
		enableTasks: process.env.ENABLE_TASKS === 'true',
		discord: {
			token: process.env.DISCORD_TOKEN,
			id: process.env.DISCORD_ID,
			devServer: process.env.DISCORD_DEVSERVER,
			ownerIds: process.env.DISCORD_OWNERIDS?.split(' ') ?? []
		},
		holodex: {
			apiKey: process.env.HOLODEX_API_KEY
		},
		youtube: {
			apikey: process.env.YOUTUBE_API_KEY
		},
		database: {
			url: process.env.DATABASE_URL
		},
		redis: {
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
			password: process.env.REDIS_PASSWORD
		},
		meili: {
			host: process.env.MEILI_HOST,
			port: Number(process.env.MEILI_PORT)
		}
	};

	const clientConfig = ClientConfigSchema.parse(rawConfig);

	container.config = clientConfig;
}
