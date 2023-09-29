import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Client } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.ClientReady
})
export class ClientListener extends Listener<typeof Events.ClientReady> {
	public async run(client: Client<true>): Promise<void> {
		await this.syncSettings(client);
	}

	private async syncSettings(client: Client): Promise<void> {
		const guilds = await this.container.prisma.guild.findMany({
			select: {
				id: true,
				relayMods: true,
				relayTranslations: true,
				blacklist: { select: { channelId: true } }
			}
		});

		for (const guild of guilds) {
			const result = client.guilds.cache.get(guild.id);
			if (!result) {
				this.container.logger.warn(`Found settings with no guild cached (${guild.id})`);
				continue;
			}

			client.settings.set(guild.id, {
				relayMods: guild.relayMods,
				relayTranslations: guild.relayTranslations,
				blacklist: new Set(guild.blacklist.map(({ channelId }) => channelId))
			});
		}
	}
}
