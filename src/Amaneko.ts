import '#lib/utils/Augments';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';
import '@sapphire/plugin-scheduled-tasks/register';
import '@sapphire/plugin-api/register';

import { loadConfig } from '#config';
import { AmanekoClient } from '#lib/extensions/AmanekoClient';
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
