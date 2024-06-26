import { AmanekoNotifier } from '../lib/extensions/AmanekoNotifier.js';
import { AmanekoEvents } from '../lib/utils/enums.js';
import { canSendGuildMessages } from '../lib/utils/permissions.js';
import { videoLink } from '../lib/utils/youtube.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '../lib/types/Holodex.js';

@ApplyOptions<AmanekoNotifier.Options>({
	name: 'StreamEndRelayHistory',
	event: AmanekoEvents.StreamEnd
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamEnd> {
	public async process(video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { prisma } = container;

		const subscriptions = await tracer.createSpan('find_subscriptions', async () => {
			return await prisma.subscription.findMany({
				where: {
					channelId: video.channel.id,
					relayChannelId: { not: null }
				},
				select: {
					relayChannelId: true,
					guild: {
						select: {
							id: true,
							relayHistoryChannelId: true
						}
					}
				}
			});
		});

		return this.some({
			video,
			subscriptions
		});
	}

	public async send({ video, subscriptions }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		if (subscriptions.length > 0) {
			const messages = await tracer.createSpan('process_subscriptions', async () => {
				return await Promise.allSettled(
					subscriptions.map(({ guild, relayChannelId }) => {
						return tracer.createSpan(`process_subscription:${guild.id}`, async () => {
							const channel = await client.channels.fetch(guild.relayHistoryChannelId ?? relayChannelId!);
							if (!canSendGuildMessages(channel)) return;

							const comments = await prisma.streamComment.findMany({
								where: { guildId: guild.id, videoId: video.id },
								select: { content: true },
								orderBy: { id: 'asc' }
							});
							if (comments.length === 0) return;

							return await channel.send({
								content: `Here are the stream logs for ${video.title}\n${videoLink(video.id)}`,
								files: [
									{
										name: `${video.id}.txt`,
										attachment: Buffer.from(comments.map(({ content }) => content).join('\n'))
									}
								]
							});
						});
					})
				);
			});

			for (const entry of messages) {
				metrics.counters.incRelayHistoryNotif({ success: entry.status === 'fulfilled' });
			}
		}

		await prisma.streamComment.deleteMany({
			where: { videoId: video.id }
		});
	}
}
