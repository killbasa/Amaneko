import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Client } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.ClientReady
})
export class ClientListener extends Listener<typeof Events.ClientReady> {
	public async run(client: Client<true>): Promise<void> {
		const { logger, config } = this.container;

		logger.info(`\nLogged in as: ${client.user.username}`);
		logger.info(`Environment: ${config.env}\n`);
	}
}
