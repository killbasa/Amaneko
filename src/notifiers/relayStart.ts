import { AmanekoEvents } from '#lib/utils/enums';
import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { videoLink } from '#lib/utils/youtube';
import { AmanekoNotifier } from '#lib/extensions/AmanekoNotifier';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<AmanekoNotifier.Options>({
	name: AmanekoEvents.StreamPrechat,
	event: AmanekoEvents.StreamPrechat
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamPrechat> {
	public async process(video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { prisma } = container;

		if (video.topic_id && HolodexMembersOnlyPatterns.includes(video.topic_id)) {
			return this.none();
		}

		const subscriptions = await tracer.createSpan('find_subscriptions', async () => {
			return prisma.subscription.findMany({
				where: { channelId: video.channel.id, relayChannelId: { not: null } },
				select: { guildId: true, relayChannelId: true }
			});
		});
		if (subscriptions.length === 0) return this.none();

		return this.some({
			video,
			subscriptions
		});
	}

	public async send({ video, subscriptions }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { client, metrics } = container;

		const embed = this.buildEmbed(video);

		const messages = await Promise.allSettled(
			subscriptions.map(({ guildId, relayChannelId }) => {
				return tracer.createSpan(`process_subscription:${guildId}`, async () => {
					if (!relayChannelId) return;

					const discordChannel = await client.channels.fetch(relayChannelId!);
					if (!canSendGuildMessages(discordChannel)) return;

					return discordChannel.send({
						embeds: [embed]
					});
				});
			})
		);

		for (const entry of messages) {
			metrics.counters.incRelayNotif({ success: entry.status === 'fulfilled' });
		}
	}

	private buildEmbed(video: Holodex.VideoWithChannel): EmbedBuilder {
		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({
				name: video.channel.name,
				url: `https://www.youtube.com/channel/${video.channel.id}`
			})
			.setTitle(video.title)
			.setURL(videoLink(video.id))
			.setThumbnail(video.channel.photo)
			.setDescription('I will now relay translations from live translators.')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();
	}
}

void container.stores.loadPiece({
	name: AmanekoEvents.StreamPrechat,
	piece: Notifier,
	store: 'notifiers'
});
