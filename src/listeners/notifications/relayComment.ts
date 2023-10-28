import { AmanekoEvents } from '#lib/utils/enums';
import { cleanEmojis } from '#lib/utils/youtube';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { calculateTimestamp } from '#lib/utils/functions';
import { Listener, container } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildTextBasedChannel, Message } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'RelayComment',
	event: AmanekoEvents.StreamComment
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamComment> {
	public async run(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		await tracer.createSpan('relay_comment', async () => {
			const timer = metrics.histograms.observeRelay();

			const ownerCheck = comment.is_owner
				? []
				: [
						{
							OR: [{ relayMods: { not: false } }, { relayTranslations: { not: false } }]
						},
						{
							OR: [{ relayMods: { equals: comment.is_moderator } }, { relayTranslations: { equals: comment.is_tl } }]
						}
				  ];

			const relayChannelIds = await tracer.createSpan('find_subscriptions', async () => {
				return prisma.subscription.findMany({
					where: {
						channelId: video.channel.id,
						relayChannelId: { not: null },
						guild: {
							AND: ownerCheck,
							blacklist: { none: { channelId: comment.channel_id } }
						}
					},
					select: { guildId: true, relayChannelId: true }
				});
			});
			if (relayChannelIds.length === 0) return;

			const channels = await tracer.createSpan('fetch_channels', async () => {
				const fetchedChannels = await Promise.allSettled(
					relayChannelIds.map(async ({ relayChannelId }) => {
						return client.channels.fetch(relayChannelId!);
					})
				);

				return fetchedChannels
					.map((entry) => {
						if (entry.status === 'rejected') return null;
						return entry.value;
					})
					.filter((entry): entry is GuildTextBasedChannel => canSendGuildMessages(entry));
			});
			if (channels.length === 0) return;

			await tracer.createSpan('process_messages', async () => {
				comment.message = cleanEmojis(comment.message);

				const content = this.formatMessage(video.channel.id, comment);
				const historyContent = this.formatHistoryMessage(comment, video);

				const messages = await Promise.allSettled(channels.map(async (channel) => channel.send({ content })));

				await prisma.streamComment.createMany({
					data: messages
						.filter((entry): entry is PromiseFulfilledResult<Message<true>> => entry.status === 'fulfilled')
						.map((message) => {
							return {
								videoId: video.id,
								messageId: message.value.id,
								channelId: comment.channel_id,
								content: historyContent,
								guildId: message.value.guildId
							};
						})
				});

				metrics.counters.incRelayComment();
			});

			timer.end({ subscriptions: relayChannelIds.length });
		});
	}

	private formatMessage(channelId: string, comment: TLDex.CommentPayload): string {
		const message = comment.message.replaceAll('`', "'");

		if (comment.is_vtuber) {
			let prefix = AmanekoEmojis.Speaker;
			const channel = container.cache.holodexChannels.get(channelId);

			if (!channel) {
				container.logger.warn(`[Relay] No channel found for ${channelId}`, {
					listener: this.name
				});
			} else if (channel.org) {
				const emoji = VTuberOrgEmojis.get(channel.org);
				if (emoji) {
					prefix = emoji;
				} else {
					container.logger.warn(`[Relay] No emoji for ${channel.org}`, {
						listener: this.name
					});
				}
			}

			return `${prefix} **${comment.name}:** \`${message}\``;
		}

		if (comment.is_tl) {
			return `${AmanekoEmojis.Speech} ||${comment.name}:|| \`${message}\``;
		}

		if (comment.is_moderator) {
			return `${AmanekoEmojis.Tools} **${comment.name}:** \`${message}\``;
		}

		return `**${comment.name}:** \`${message}\``;
	}

	private formatHistoryMessage(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): string {
		const start = video.start_actual ?? video.start_scheduled;
		if (!start) {
			throw Error(`Received comment from stream that never started. (${video.id})`);
		}

		const timestamp = calculateTimestamp(start, comment.timestamp);
		return `${timestamp} (${comment.name}) ${comment.message}`;
	}
}
