import {ClientConfigSchema, NodeEnvEnum} from '#lib/types/Config';
import { mainFolder } from '#lib/utils/constants';
import { container } from '@sapphire/pieces';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { ClientConfig } from '#lib/types/Config';
import type { Unvalidated } from '#lib/types/Generic';
import * as process from "process";

export function loadConfig(): void {
	process.env.NODE_ENV ??= NodeEnvEnum.enum.dev;
	config({ path: resolve(mainFolder, '../.env') });

	const rawConfig: Unvalidated<ClientConfig> = {
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
	};

	const clientConfig = ClientConfigSchema.parse(rawConfig);

	container.config = clientConfig;
}
