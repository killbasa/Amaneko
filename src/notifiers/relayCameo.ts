import { AmanekoEvents } from '#lib/utils/enums';
import { cleanEmojis, videoLink } from '#lib/utils/youtube';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { AmanekoEmojis, VTuberOrgEmojis } from '#lib/utils/constants';
import { AmanekoNotifier } from '#lib/extensions/AmanekoNotifier';
import { shouldFilterCameo } from '#utils/notifications';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildTextBasedChannel } from 'discord.js';
import type { HolodexChannel } from '@prisma/client';

@ApplyOptions<AmanekoNotifier.Options>({
	name: 'RelayCameo',
	event: AmanekoEvents.StreamComment
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamComment> {
	public async process(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { prisma, client, logger } = container;

		if (shouldFilterCameo(comment, video)) return this.none();

		const targetChannel = container.cache.holodexChannels.get(video.channel.id);
		if (!targetChannel) {
			container.logger.warn(`[Cameo] No channel found for ${video.channel.id} (target)`);
			return this.none();
		}

		const cameoChannelIds = await tracer.createSpan('find_subscriptions', async () => {
			return prisma.subscription.findMany({
				where: {
					channelId: comment.channel_id,
					cameoChannelId: { not: null }
				},
				select: { guildId: true, cameoChannelId: true }
			});
		});
		if (cameoChannelIds.length === 0) {
			logger.debug(`[Cameo] No subscriptions found for ${comment.channel_id} (${video.channel.id})`);
			return this.none();
		}

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
		if (channels.length === 0) {
			return this.none();
		}

		comment.message = cleanEmojis(comment.message);

		return this.some({
			channels,
			content: this.formatMessage(targetChannel, comment, video)
		});
	}

	public async send({ channels, content }: AmanekoNotifier.ProcessResult<this>) {
		const { container } = this;
		const { metrics } = container;

		const messages = await Promise.allSettled(
			channels.map(async (channel) => {
				return channel.send({ content });
			})
		);

		for (const entry of messages) {
			metrics.counters.incCameo({ success: entry.status === 'fulfilled' });
		}
	}

	private formatMessage(
		targetChannel: HolodexChannel, //
		comment: TLDex.CommentPayload,
		video: Holodex.VideoWithChannel
	): string {
		const { logger, cache } = this.container;

		let prefix = AmanekoEmojis.Speaker;
		const message = comment.message.replaceAll('`', "'");
		const channel: HolodexChannel | undefined = comment.channel_id //
			? cache.holodexChannels.get(comment.channel_id)
			: undefined;

		if (!channel) {
			logger.warn(`[Cameo] No channel found for ${comment.channel_id} (comment)`);
		} else if (channel.org) {
			const emoji = VTuberOrgEmojis.get(channel.org);
			if (emoji) {
				prefix = emoji;
			} else {
				logger.warn(`[Cameo] No emoji for ${channel.org}`);
			}
		}

		const name: string = channel?.englishName ?? channel?.name ?? comment.name;
		const targetName: string = targetChannel.englishName ?? targetChannel.name;
		return `${prefix} **${name}** in [**${targetName}**'s chat](<${videoLink(video.id)}>): \`${message}\``;
	}
}

void container.stores.loadPiece({
	name: 'RelayCameo',
	piece: Notifier,
	store: 'notifiers'
});
