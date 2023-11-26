import { AmanekoEvents } from '#lib/utils/enums';
import { cleanEmojis, videoLink } from '#lib/utils/youtube';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { calculateTimestamp } from '#lib/utils/functions';
import { resolveRelayQuery, shouldFilterComment } from '#lib/utils/notifications';
import { AmanekoNotifier } from '#lib/extensions/AmanekoNotifier';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import type { GuildTextBasedChannel, Message } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<AmanekoNotifier.Options>({
	event: AmanekoEvents.StreamComment
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamComment> {
	public async process(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { prisma, client, logger } = container;
		const { channel_id: cmtChannelId } = comment;

		if (shouldFilterComment(comment, video)) return this.none();

		const relayChannelIds = await tracer.createSpan('find_subscriptions', async () => {
			return prisma.subscription.findMany({
				where: resolveRelayQuery(comment, video),
				select: { guildId: true, relayChannelId: true }
			});
		});
		if (relayChannelIds.length === 0) {
			logger.debug(`[Relay] No subscriptions found for ${video.channel.id} (${cmtChannelId})`);
			return this.none();
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
		if (channels.length === 0) return this.none();

		comment.message = cleanEmojis(comment.message);

		return this.some({
			channels,
			content: this.formatMessage(comment, video),
			videoId: video.id,
			cmtChannelId,
			historyContent: this.formatHistoryMessage(comment, video)
		});
	}

	public async send({ channels, content, videoId, cmtChannelId, historyContent }: AmanekoNotifier.ProcessResult<this>) {
		const { container } = this;
		const { prisma, metrics } = container;

		const messages = await Promise.allSettled(
			channels.map(async (channel) => {
				return channel.send({ content });
			})
		);

		await prisma.streamComment.createMany({
			data: messages
				.filter((entry): entry is PromiseFulfilledResult<Message<true>> => entry.status === 'fulfilled')
				.map((message) => {
					return {
						videoId,
						messageId: message.value.id,
						channelId: cmtChannelId,
						content: historyContent,
						guildId: message.value.guildId
					};
				})
		});

		for (const entry of messages) {
			metrics.counters.incRelayComment({ success: entry.status === 'fulfilled' });
		}
	}

	private formatMessage(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): string {
		const { logger, cache } = this.container;

		let prefix = `**${comment.name}:**`;
		const message = comment.message.replaceAll('`', "'");

		if (comment.is_vtuber && comment.channel_id) {
			let emoji = AmanekoEmojis.Speaker;
			const channel = cache.holodexChannels.get(comment.channel_id);

			if (!channel) {
				logger.warn(`[Relay] No channel found for ${comment.channel_id}`);
			} else if (channel.org) {
				const orgEmoji = VTuberOrgEmojis.get(channel.org);
				if (orgEmoji) {
					emoji = orgEmoji;
				} else {
					logger.warn(`[Relay] No emoji for ${channel.org}`);
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

void container.stores.loadPiece({
	name: 'RelayComment',
	piece: Notifier,
	store: 'notifiers'
});
