import { AmanekoEvents } from '#lib/utils/Events';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { cleanEmojis } from '#lib/utils/youtube';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildTextBasedChannel, Message } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.StreamComment,
	event: AmanekoEvents.StreamComment
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamComment> {
	public async run(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): Promise<void> {
		const { prisma, client, metrics } = this.container;

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

		const relayChannelIds = await prisma.subscription.findMany({
			where: {
				channelId: video.channel.id,
				relayChannelId: { not: null },
				guild: {
					AND: ownerCheck,
					blacklist: { none: { channelId: comment.channel_id } }
				}
			},
			select: { relayChannelId: true }
		});

		if (relayChannelIds.length === 0) return;

		const fetchedChannels = await Promise.allSettled(
			relayChannelIds.map(async ({ relayChannelId }) => {
				return client.channels.fetch(relayChannelId!);
			})
		);

		const channels = fetchedChannels
			.map((entry) => {
				if (entry.status === 'rejected') return null;
				return entry.value;
			})
			.filter((entry): entry is GuildTextBasedChannel => entry !== null && entry.isTextBased());

		const content = this.formatMessage(video.channel.id, comment);
		const historyContent = this.formatHistoryMessage(comment, video);

		const messages = await Promise.allSettled(channels.map(async (channel) => channel.send({ content })));

		await prisma.$transaction(
			messages
				.filter((entry): entry is PromiseFulfilledResult<Message<true>> => entry.status === 'fulfilled')
				// eslint-disable-next-line @typescript-eslint/promise-function-async
				.map((message) => {
					return prisma.streamComment.create({
						data: {
							videoId: video.id,
							content: historyContent,
							guild: { connect: { id: message.value.guildId } }
						}
					});
				})
		);

		metrics.incrementRelayComment();
	}

	private formatMessage(channelId: string, comment: TLDex.CommentPayload): string {
		const message = cleanEmojis(comment.message).replaceAll('`', "'");

		if (comment.is_vtuber) {
			const channel = this.container.cache.holodexChannels.get(channelId)!;

			let prefix: string;
			if (channel.org) {
				const emoji = VTuberOrgEmojis.get(channel.org);
				if (emoji) {
					prefix = emoji;
				} else {
					this.container.logger.warn(`[Relay] No emoji for ${channel.org}`);
					prefix = AmanekoEmojis.Speaker;
				}
			} else {
				prefix = AmanekoEmojis.Speaker;
			}

			return `${prefix} **${comment.name}:** \`${message}\``;
		}

		if (comment.is_tl) {
			return `${AmanekoEmojis.Speech} ||${comment.name}:|| \`${message}\``;
		}

		if (comment.is_moderator) {
			return `${AmanekoEmojis.Tools} **${comment.name}:** \`${message}\``;
		}

		return `${comment.name}: \`${message}\``;
	}

	private formatHistoryMessage(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): string {
		const start = video.start_actual ?? video.start_scheduled;
		if (!start) {
			throw Error(`Received comment from stream that never started. (${video.id})`);
		}

		const startTime = new Date(Date.parse(start)).valueOf();
		const loggedTime = new Date(comment.timestamp).valueOf();
		const timestamp = new Date(loggedTime - startTime).toISOString().substring(11, 19);

		return `${timestamp} (${comment.name}) ${comment.message}`;
	}
}
