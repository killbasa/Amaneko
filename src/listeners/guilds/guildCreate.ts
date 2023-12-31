import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildCreate
})
export class GuildListener extends Listener<typeof Events.GuildCreate> {
	public async run(guild: Guild): Promise<void> {
		const { prisma } = this.container;

		const isBlacklisted = await prisma.guildBlacklist.findUnique({
			where: { guildId: guild.id }
		});
		if (isBlacklisted !== null) {
			await guild.leave();
			return;
		}

		await prisma.guild.create({
			data: { id: guild.id }
		});
	}
}
