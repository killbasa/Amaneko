import { AmanekoEvents } from '#lib/utils/enums';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { cleanEmojis, videoLink } from '#lib/utils/youtube';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { Listener, container } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildTextBasedChannel } from 'discord.js';

@ApplyOptions<Listener.Options>({
	name: 'RelayCameo',
	event: AmanekoEvents.StreamComment
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamComment> {
	public async run(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		const { is_owner: isOwner, is_vtuber: isVTuber, channel_id: channelId } = comment;
		if (!channelId || isOwner || !isVTuber) return;

		const targetChannel = container.cache.holodexChannels.get(channelId);
		if (!targetChannel) {
			container.logger.warn(`[Relay] No channel found for ${channelId} (target)`, {
				listener: this.name
			});
			return;
		}

		await tracer.createSpan('relay_cameo', async () => {
			const timer = metrics.histograms.observeRelay();

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
					.filter((entry): entry is GuildTextBasedChannel => canSendGuildMessages(entry));
			});
			if (channels.length === 0) return;

			await tracer.createSpan('process_messages', async () => {
				comment.message = cleanEmojis(comment.message);

				const content = this.formatMessage(video.channel.id, targetChannel.name, comment, video);
				await Promise.allSettled(channels.map(async (channel) => channel.send({ content })));

				metrics.counters.incCameo();
			});

			timer.end({ subscriptions: cameoChannelIds.length });
		});
	}

	private formatMessage(channelId: string, targetName: string, comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): string {
		let prefix = AmanekoEmojis.Speaker;
		const message = comment.message.replaceAll('`', "'");
		const channel = container.cache.holodexChannels.get(channelId);

		if (!channel) {
			container.logger.warn(`[Relay] No channel found for ${channelId} (comment)`, {
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

		return `${prefix} **${comment.name}** in **${targetName}**'s chat: \`${message}\`\n**Chat:** [${video.title}](${videoLink(video.id)})`;
	}
}
