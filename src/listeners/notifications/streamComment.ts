import { AmanekoEvents } from '#lib/utils/Events';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildTextBasedChannel } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.StreamComment,
	event: AmanekoEvents.StreamComment
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamComment> {
	public async run(channelId: string, comment: TLDex.CommentPayload): Promise<void> {
		const relayChannelIds = await this.container.prisma.subscription.findMany({
			where: { channelId, relayChannelId: { not: null } },
			select: { relayChannelId: true }
		});

		const guildsYoutubeBlacklist = (
			await this.container.prisma.blacklist.findMany({
				where: { channelId: comment.channel_id },
				select: { guildId: true }
			})
		).map((entry) => entry.guildId);

		if (relayChannelIds.length < 1) return;

		const fetchedChannels = await Promise.allSettled(
			relayChannelIds.map(async ({ relayChannelId }) => {
				return this.container.client.channels.fetch(relayChannelId!);
			})
		);

		const channels = fetchedChannels
			.map((entry) => {
				if (entry.status === 'rejected') return null;
				return entry.value;
			})
			.filter((entry): entry is GuildTextBasedChannel => entry !== null && entry.isTextBased())
			.filter((channel) => !guildsYoutubeBlacklist.includes(channel.guildId));

		const content = this.formatMessage(channelId, comment);

		await Promise.allSettled([
			channels.map(async (channel) => {
				return channel.send({ content });
			})
		]);
	}

	private formatMessage(channelId: string, comment: TLDex.CommentPayload): string {
		if (comment.is_vtuber) {
			const channel = this.container.cache.holodexChannels.get(channelId);
			const org = channel?.org ?? '';

			return `[${org}] **${comment.name}:** \`${comment.message}\``;
		}

		if (comment.is_tl) {
			return `:speech_balloon:||${comment.name}:|| \`${comment.message}\``;
		}

		if (comment.is_moderator) {
			return `:tools:**${comment.name}:** \`${comment.message}\``;
		}

		return `${comment.name}: \`${comment.message}\``;
	}
}
