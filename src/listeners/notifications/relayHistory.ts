import { AmanekoEvents } from '#lib/utils/Events';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'StreamEndRelayHistory',
	event: AmanekoEvents.StreamEnd
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamEnd> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { prisma, client, metrics } = this.container;

		const subscriptions = await prisma.subscription.findMany({
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

		for (const { guild, relayChannelId } of subscriptions) {
			const channel = await client.channels.fetch(guild.relayHistoryChannelId ?? relayChannelId!);
			if (!channel?.isTextBased()) continue;

			try {
				const comments = await prisma.streamComment.findMany({
					where: { guildId: guild.id, videoId: video.id },
					select: { content: true },
					orderBy: { id: 'asc' }
				});
				if (comments.length === 0) continue;

				await channel.send({
					content: `Here is this stream's TL log. <https://youtu.be/${video.id}>`,
					files: [
						{
							name: `${video.id}.txt`,
							attachment: Buffer.from(comments.map(({ content }) => content).join('\n'))
						}
					]
				});
				metrics.incrementRelayHistory({ success: true });
			} catch (err) {
				metrics.incrementRelayHistory({ success: false });
			} finally {
				await prisma.streamComment.deleteMany({
					where: { guildId: guild.id, videoId: video.id }
				});
			}
		}
	}
}
