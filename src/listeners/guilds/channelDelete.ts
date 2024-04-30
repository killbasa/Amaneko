import { isNotifChannel } from '../../lib/utils/discord.js';
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

		await Promise.allSettled([
			prisma.guild.update({
				where: {
					id: channel.guildId,
					scheduleChannelId: channel.id
				},
				data: { scheduleChannelId: null }
			}),
			prisma.guild.update({
				where: {
					id: channel.guildId,
					relayHistoryChannelId: channel.id
				},
				data: { relayHistoryChannelId: null }
			})
		]);

		await prisma.$transaction([
			prisma.subscription.updateMany({
				where: {
					guildId: channel.guildId,
					discordChannelId: channel.id
				},
				data: { discordChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: {
					guildId: channel.guildId,
					memberDiscordChannelId: channel.id
				},
				data: { memberDiscordChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: {
					guildId: channel.guildId,
					relayChannelId: channel.id
				},
				data: { relayChannelId: null }
			}),
			prisma.subscription.updateMany({
				where: {
					guildId: channel.guildId,
					communityPostChannelId: channel.id
				},
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
