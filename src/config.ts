import { ClientConfigSchema } from 'lib/types/Config';
import { container } from '@sapphire/pieces';
import type { ClientConfig } from 'lib/types/Config';

export function loadConfig(): ClientConfig {
	const config = ClientConfigSchema.parse({
		discord: {
			token: process.env.DISCORD_TOKEN,
			id: process.env.DISCORD_ID
		}
	});

	container.config = config;

	return config;
}
