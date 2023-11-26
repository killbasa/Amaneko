import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { yellowBright } from 'colorette';
import type { Client } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.ClientReady
})
export class ClientListener extends Listener<typeof Events.ClientReady> {
	public async run(client: Client<true>): Promise<void> {
		const { config, logger } = this.container;

		const pad = ' '.repeat(3);
		const title = yellowBright;

		logger.info(`${pad}${title('Logged in as')}: ${client.user.username}`);
		logger.info(`${pad}${title('Environment')}: ${config.env}`);

		this.printList({
			title: title('Stores'),
			array: this.container.stores.map((store) => `${store.size} ${store.name}`),
			pad
		});
	}

	private printList(data: { pad: string; title: string; array: string[] }): void {
		const { logger } = this.container;
		const { pad, title, array } = data;

		logger.info(`\n${pad}${title}`);
		const last = array.pop();

		for (const entry of array) {
			logger.info(`${pad}├─ ${entry}`);
		}

		logger.info(`${pad}└─ ${last}`);
	}
}
