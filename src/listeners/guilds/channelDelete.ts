import { isNotifChannel } from '#lib/utils/discord';
import { Events, Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { DMChannel, NewsChannel, NonThreadGuildBasedChannel, TextChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: Events.ChannelDelete
})
export class GuildListener extends Listener<typeof Events.ChannelDelete> {
	public async run(channel: DMChannel | NonThreadGuildBasedChannel): Promise<void> {
		const { prisma } = this.container;

		if (!this.isValid(channel)) return;

		// Using upsert since update can throw an error.
		await prisma.$transaction([
			prisma.guild.upsert({
				where: {
					id: channel.guildId,
					scheduleChannelId: channel.id
				},
				update: { scheduleChannelId: null },
				create: { id: channel.guildId }
			}),
			prisma.guild.upsert({
				where: {
					id: channel.guildId,
					relayHistoryChannelId: channel.id
				},
				update: { relayHistoryChannelId: null },
				create: { id: channel.guildId }
			}),
			prisma.subscription.updateMany({
				where: { discordChannelId: channel.id },
				data: { discordChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: { memberDiscordChannelId: channel.id },
				data: { memberDiscordChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: { relayChannelId: channel.id },
				data: { relayChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: { communityPostChannelId: channel.id },
				data: { communityPostChannelId: null }
			})
		]);
	}

	private isValid(channel: DMChannel | NonThreadGuildBasedChannel): channel is NewsChannel | TextChannel {
		if (channel.isDMBased() || !channel.isTextBased()) {
			return false;
		}

		return isNotifChannel(channel.type);
	}
}
