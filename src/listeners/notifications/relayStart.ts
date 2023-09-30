import { AmanekoEvents } from '#lib/utils/Events';
import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { permissionsCheck } from '#utils/discord';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'RelayStartNotification',
	event: AmanekoEvents.StreamStart
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamStart> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { prisma, client, metrics } = this.container;

		if (video.topic_id && HolodexMembersOnlyPatterns.includes(video.topic_id)) {
			return;
		}

		const subscriptions = await prisma.subscription.findMany({
			where: { channelId: video.channel.id, relayChannelId: { not: null } },
			select: { relayChannelId: true }
		});
		if (subscriptions.length === 0) return;

		const embed = this.buildEmbed(video);

		const result = await Promise.allSettled(
			subscriptions.map(async ({ relayChannelId }) => {
				if (!relayChannelId) return;

				const discordChannel = await client.channels.fetch(relayChannelId!);
				if (!discordChannel?.isTextBased()) return;
				if (!(await permissionsCheck(discordChannel.id))) {
					return;
				}

				return discordChannel.send({
					embeds: [embed]
				});
			})
		);

		for (const entry of result) {
			metrics.incrementRelay({ success: entry.status === 'fulfilled' });
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
			.setURL(`https://youtu.be/${video.id}`)
			.setThumbnail(video.channel.photo)
			.setDescription('I will now relay translations from live translators.')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();
	}
}
