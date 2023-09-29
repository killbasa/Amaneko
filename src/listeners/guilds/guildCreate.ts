import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildCreate
})
export class GuildListener extends Listener<typeof Events.GuildCreate> {
	public async run(guild: Guild): Promise<void> {
		const { client, prisma } = this.container;

		const settings = await prisma.guild.create({
			data: { id: guild.id }
		});
		client.settings.set(guild.id, {
			relayMods: settings.relayMods,
			relayTranslations: settings.relayTranslations,
			blacklist: new Set()
		});
	}
}
