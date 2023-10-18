import { AmanekoEvents } from '#lib/utils/enums';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { cleanEmojis } from '#lib/utils/youtube';
import { TLDexClient } from '#lib/structures/TLDexClient';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildTextBasedChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
	name: 'RelayCameo',
	event: AmanekoEvents.StreamComment,
	enabled: false
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamComment> {
	public async run(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		if (!comment.is_vtuber) return;

		await tracer.createSpan('relay_cameo', async () => {
			const cameoChannelIds = await tracer.createSpan('find_subscriptions', async () => {
				return prisma.subscription.findMany({
					where: {
						channelId: comment.channel_id,
						cameoChannelId: { not: null }
					},
					select: { guildId: true, cameoChannelId: true }
				});
			});
			if (cameoChannelIds.length === 0) return;

			const channels = await tracer.createSpan('fetch_channels', async () => {
				const fetchedChannels = await Promise.allSettled(
					cameoChannelIds.map(async ({ cameoChannelId }) => {
						return client.channels.fetch(cameoChannelId!);
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
				await Promise.allSettled(channels.map(async (channel) => channel.send({ content })));

				metrics.counters.incCameo();
			});
		});
	}
}
