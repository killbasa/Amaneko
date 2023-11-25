import { AmanekoEvents } from '#lib/utils/enums';
import { cleanEmojis, videoLink } from '#lib/utils/youtube';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { calculateTimestamp } from '#lib/utils/functions';
import { resolveRelayQuery, shouldFilterComment } from '#lib/utils/notifications';
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
		const { prisma, client, metrics, logger } = container;
		const { channel_id: cmtChannelId } = comment;

		if (shouldFilterComment(comment, video)) return;

		await tracer.createSpan('relay_comment', async () => {
			const relayChannelIds = await tracer.createSpan('find_subscriptions', async () => {
				return prisma.subscription.findMany({
					where: resolveRelayQuery(comment, video),
					select: { guildId: true, relayChannelId: true }
				});
			});
			if (relayChannelIds.length === 0) {
				logger.debug(`[Relay] No subscriptions found for ${video.channel.id} (${cmtChannelId})`);
				return;
			}

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

				const content = this.formatMessage(comment, video);
				const historyContent = this.formatHistoryMessage(comment, video);

				const messages = await Promise.allSettled(channels.map(async (channel) => channel.send({ content })));

				await prisma.streamComment.createMany({
					data: messages
						.filter((entry): entry is PromiseFulfilledResult<Message<true>> => entry.status === 'fulfilled')
						.map((message) => {
							return {
								videoId: video.id,
								messageId: message.value.id,
								channelId: cmtChannelId,
								content: historyContent,
								guildId: message.value.guildId
							};
						})
				});

				metrics.counters.incRelayComment();
			});
		});
	}

	private formatMessage(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): string {
		const message = comment.message.replaceAll('`', "'");

		let prefix = `**${comment.name}:**`;

		if (comment.is_vtuber && comment.channel_id) {
			let emoji = AmanekoEmojis.Speaker;
			const channel = container.cache.holodexChannels.get(comment.channel_id);

			if (!channel) {
				container.logger.warn(`[Relay] No channel found for ${comment.channel_id}`, {
					listener: this.name
				});
			} else if (channel.org) {
				const orgEmoji = VTuberOrgEmojis.get(channel.org);
				if (orgEmoji) {
					emoji = orgEmoji;
				} else {
					container.logger.warn(`[Relay] No emoji for ${channel.org}`, {
						listener: this.name
					});
				}
			}

			const name: string = channel?.englishName ?? channel?.name ?? comment.name;
			prefix = `${emoji} **${name}:**`;
		} else if (comment.is_tl) {
			prefix = `${AmanekoEmojis.Speech} ||${comment.name}:||`;
		} else if (comment.is_moderator) {
			prefix = `${AmanekoEmojis.Tools} **${comment.name}:**`;
		}

		const name = video.channel.english_name ?? video.channel.name;
		return `${prefix} \`${message}\`\n**Chat:** [${name}](<${videoLink(video.id)}>)`;
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
