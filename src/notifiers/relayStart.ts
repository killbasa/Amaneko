import { AmanekoNotifier } from '../lib/extensions/AmanekoNotifier.js';
import { BrandColors, HolodexMembersOnlyPatterns } from '../lib/utils/constants.js';
import { AmanekoEvents } from '../lib/utils/enums.js';
import { canSendGuildMessages } from '../lib/utils/permissions.js';
import { videoLink } from '../lib/utils/youtube.js';
import { EmbedBuilder } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '../lib/types/Holodex.js';

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
			return await prisma.subscription.findMany({
				where: { channelId: video.channel.id, relayChannelId: { not: null } },
				select: { guildId: true, relayChannelId: true }
			});
		});
		if (subscriptions.length === 0) return this.none();

		return this.some({
			subscriptions,
			embed: this.buildEmbed(video)
		});
	}

	public async send({ subscriptions, embed }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { client, metrics } = container;

		const messages = await Promise.allSettled(
			subscriptions.map(({ guildId, relayChannelId }) => {
				return tracer.createSpan(`process_subscription:${guildId}`, async () => {
					if (!relayChannelId) return;

					const discordChannel = await client.channels.fetch(relayChannelId!);
					if (!canSendGuildMessages(discordChannel)) return;

					return await discordChannel.send({
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
