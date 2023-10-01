import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType } from 'discord.js';
import type { DMChannel, NewsChannel, NonThreadGuildBasedChannel, TextChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.ChannelDelete
})
export class GuildListener extends Listener<typeof Events.ChannelDelete> {
	public async run(channel: DMChannel | NonThreadGuildBasedChannel): Promise<void> {
		if (!this.isValid(channel)) return;

		await this.container.prisma.$transaction([
			this.container.prisma.guild.update({
				where: {
					id: channel.guildId,
					scheduleChannelId: channel.id
				},
				data: { scheduleChannelId: null }
			}),
			this.container.prisma.subscription.updateMany({
				where: { discordChannelId: channel.id },
				data: { discordChannelId: null }
			}),
			this.container.prisma.subscription.updateMany({
				where: { memberDiscordChannelId: channel.id },
				data: { memberDiscordChannelId: null }
			}),
			this.container.prisma.subscription.updateMany({
				where: { relayChannelId: channel.id },
				data: { relayChannelId: null }
			}),
			this.container.prisma.subscription.updateMany({
				where: { communityPostChannelId: channel.id },
				data: { communityPostChannelId: null }
			})
		]);
	}

	private isValid(channel: DMChannel | NonThreadGuildBasedChannel): channel is NewsChannel | TextChannel {
		if (channel.isDMBased() || !channel.isTextBased()) {
			return false;
		}

		if (![ChannelType.GuildAnnouncement, ChannelType.GuildText].includes(channel.type)) {
			return false;
		}

		return true;
	}
}
