import '@sapphire/plugin-logger/register';

import { AmananekoClient } from 'lib/AmanekoClient';
import { loadConfig } from 'config';
import { ApplicationCommandRegistries, RegisterBehavior, container } from '@sapphire/framework';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

async function main(): Promise<void> {
	let client: AmananekoClient | undefined = undefined;

	try {
		const { discord } = container.config;

		client = new AmananekoClient();

		await client.login(discord.token);
	} catch (error: unknown) {
		container.logger.error(error);

		await client?.destroy();
		process.exit(1);
	}
}

void loadConfig();
void main();
