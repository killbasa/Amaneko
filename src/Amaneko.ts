import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';

import { loadConfig } from '#config';
import { AmanekoClient } from '#lib/AmanekoClient';
import { ApplicationCommandRegistries, RegisterBehavior, container } from '@sapphire/framework';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

async function main(): Promise<void> {
	let client: AmanekoClient | undefined = undefined;

	try {
		const { discord } = container.config;

		client = new AmanekoClient();

		await client.login(discord.token);
	} catch (error: unknown) {
		container.logger.error(error);

		await client?.destroy();
		process.exit(1);
	}
}

loadConfig();
void main();
