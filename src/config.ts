import { NodeEnv } from './lib/utils/enums.js';
import { ClientConfigSchema } from './lib/types/Config.js';
import { mainFolder } from './lib/utils/constants.js';
import { container } from '@sapphire/framework';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { ClientConfig } from './lib/types/Config.js';
import type { Unvalidated } from './lib/types/Generic.js';

export function loadConfig(): void {
	process.env.NODE_ENV ??= NodeEnv.Dev;
	config({ path: resolve(mainFolder, '../.env') });

	const env = process.env.NODE_ENV;
	const isDev =
		env !== NodeEnv.Production && //
		env !== NodeEnv.Staging;

	const rawConfig: Unvalidated<ClientConfig> = {
		env,
		isDev,
		enableTasks: !isDev || process.env.ENABLE_TASKS === 'true',
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
		},
		o11y: {
			otel: {
				endpoint: process.env.OTEL_ENDPOINT
			},
			metrics: {
				port: Number(process.env.METRICS_PORT)
			}
		}
	};

	const clientConfig = ClientConfigSchema.parse(rawConfig);

	container.config = clientConfig;
}
