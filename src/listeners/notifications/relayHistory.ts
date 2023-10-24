import { AmanekoEvents } from '#lib/utils/enums';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'StreamEndRelayHistory',
	event: AmanekoEvents.StreamEnd
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamEnd> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		await tracer.createSpan('relay_history', async () => {
			const subscriptions = await tracer.createSpan('find_subscriptions', async () => {
				return prisma.subscription.findMany({
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
			if (subscriptions.length === 0) return;

			const result = await tracer.createSpan('process_subscriptions', async () => {
				return Promise.allSettled(
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

							return channel.send({
								content: `Here is this stream's TL log. <https://youtu.be/${video.id}>`,
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

			for (const entry of result) {
				metrics.counters.incRelayHistoryNotif({ success: entry.status === 'fulfilled' });
			}

			await tracer.createSpan('cleanup_comments', async () => {
				return Promise.allSettled(
					subscriptions.map(({ guild }) => {
						return prisma.streamComment.deleteMany({
							where: { guildId: guild.id, videoId: video.id }
						});
					})
				);
			});
		});
	}
}
