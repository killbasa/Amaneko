import { AmanekoEvents } from '#lib/utils/enums';
import { cleanEmojis } from '#lib/utils/youtube';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { TLDexClient } from '#lib/structures/TLDexClient';
import { Listener } from '@sapphire/framework';
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
					.filter((entry): entry is GuildTextBasedChannel => entry !== null && entry.isTextBased());
			});
			if (channels.length === 0) return;

			await tracer.createSpan('process_messages', async () => {
				comment.message = cleanEmojis(comment.message);

				const content = TLDexClient.formatMessage(video.channel.id, comment);
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

				metrics.counters.incRelayComment();
			});

			timer.end({ subscriptions: relayChannelIds.length });
		});
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
