import { AmanekoEvents } from '#lib/utils/Events';
import { BrandColors } from '#lib/utils/constants';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'RelayStartNotification',
	event: AmanekoEvents.StreamStart
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamStart> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({
				name: video.channel.name,
				url: `https://www.youtube.com/channel/${video.channel.id}`
			})
			.setTitle(video.title)
			.setURL(`https://youtu.be/${video.id}`)
			.setThumbnail(video.channel.photo)
			.setDescription('I will now relay translations from live translators.')
			.setFooter({ text: 'Powered by Holodex' });

		const components = new ActionRowBuilder<ButtonBuilder>().setComponents([
			new ButtonBuilder() //
				.setStyle(ButtonStyle.Link)
				.setURL(`https://youtu.be/${video.id}`)
				.setLabel('Watch Stream')
		]);

		const subscriptions = await this.container.prisma.subscription.findMany({
			where: { channelId: video.channel.id, relayChannelId: { not: null } },
			select: { relayChannelId: true }
		});

		await Promise.allSettled(
			subscriptions.map(async ({ relayChannelId }) => {
				if (!relayChannelId) return;

				const discordChannel = await this.container.client.channels.fetch(relayChannelId!);
				if (!discordChannel?.isTextBased()) return;

				return discordChannel.send({
					embeds: [embed],
					components: [components]
				});
			})
		);
	}
}
