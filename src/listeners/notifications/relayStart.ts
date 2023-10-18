import { AmanekoEvents } from '#lib/utils/enums';
import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.StreamPrechat,
	event: AmanekoEvents.StreamPrechat
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamPrechat> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { prisma, client, metrics } = container;

		if (video.topic_id && HolodexMembersOnlyPatterns.includes(video.topic_id)) {
			return;
		}

		await tracer.createSpan('relay_start', async () => {
			const subscriptions = await tracer.createSpan('find_subscriptions', async () => {
				return prisma.subscription.findMany({
					where: { channelId: video.channel.id, relayChannelId: { not: null } },
					select: { guildId: true, relayChannelId: true }
				});
			});
			if (subscriptions.length === 0) return;

			const result = await tracer.createSpan('process_subscriptions', async () => {
				const embed = this.buildEmbed(video);

				return Promise.allSettled(
					subscriptions.map(({ guildId, relayChannelId }) => {
						return tracer.createSpan(`process_subscription:${guildId}`, async () => {
							if (!relayChannelId) return;

							const discordChannel = await client.channels.fetch(relayChannelId!);
							if (!discordChannel?.isTextBased()) return;

							return discordChannel.send({
								embeds: [embed]
							});
						});
					})
				);
			});

			for (const entry of result) {
				metrics.counters.incRelayNotif({ success: entry.status === 'fulfilled' });
			}
		});
	}

	private buildEmbed(video: Holodex.VideoWithChannel): EmbedBuilder {
		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({
				name: video.channel.name,
				url: `https://www.youtube.com/channel/${video.channel.id}`
			})
			.setTitle(video.title)
			.setURL(`https://youtu.be/${video.id}`)
			.setThumbnail(video.channel.photo)
			.setDescription('I will now relay translations from live translators.')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();
	}
}
