import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.GuildCreate
})
export class GuildListener extends Listener<typeof Events.GuildCreate> {
	public async run(guild: Guild): Promise<void> {
		await this.container.prisma.guild.create({
			data: { id: guild.id }
		});
	}
}
