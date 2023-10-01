import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildDelete
})
export class GuildListener extends Listener<typeof Events.GuildDelete> {
	public async run(guild: Guild): Promise<void> {
		const { prisma } = this.container;

		await prisma.guild.delete({
			where: { id: guild.id }
		});
	}
}
