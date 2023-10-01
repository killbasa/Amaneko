import { AmanekoEvents } from '#lib/utils/Events';
import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { YoutubeEmbedsKey } from '#lib/utils/cache';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, roleMention } from 'discord.js';
import type { Channel } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.StreamStart,
	event: AmanekoEvents.StreamStart
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamStart> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { prisma, client, metrics } = this.container;

		const membersStream = video.topic_id ? HolodexMembersOnlyPatterns.includes(video.topic_id) : false;
		const subscriptions = await prisma.subscription.findMany({
			where: {
				channelId: video.channel.id,
				OR: [{ discordChannelId: { not: null } }, { memberDiscordChannelId: { not: null } }]
			},
			select: { discordChannelId: true, memberDiscordChannelId: true, roleId: true, memberRoleId: true }
		});

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({
				name: video.channel.name,
				iconURL: video.channel.photo,
				url: `https://www.youtube.com/channel/${video.channel.id}`
			})
			.setTitle(video.title)
			.setURL(`https://youtu.be/${video.id}`)
			.setThumbnail(video.channel.photo)
			.setImage(`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`)
			.setDescription(video.description?.slice(0, 50) || null)
			.setFooter({ text: `Powered by Holodex` })
			.setTimestamp();

		const components = new ActionRowBuilder<ButtonBuilder>().setComponents([
			new ButtonBuilder() //
				.setStyle(ButtonStyle.Link)
				.setURL(`https://youtu.be/${video.id}`)
				.setLabel('Watch Stream')
		]);

		const sentMessages = await Promise.allSettled(
			subscriptions.map(async ({ discordChannelId, memberDiscordChannelId, roleId, memberRoleId }) => {
				let discordChannel: Channel | null = null;
				let role = '';
				const allowedRoles: string[] = [];

				if (membersStream && memberDiscordChannelId) {
					discordChannel = await client.channels.fetch(memberDiscordChannelId);
					if (memberRoleId) {
						role = `${roleMention(memberRoleId)} `;
						allowedRoles.push(memberRoleId);
					}
				} else if (discordChannelId) {
					discordChannel = await client.channels.fetch(discordChannelId);
					if (roleId) {
						role = `${roleMention(roleId)} `;
						allowedRoles.push(roleId);
					}
				}

				if (!discordChannel?.isTextBased()) return;

				return discordChannel.send({
					content: `${role}${video.channel.name} is now live!`,
					allowedMentions: { roles: allowedRoles },
					embeds: [embed],
					components: [components]
				});
			})
		);

		const embedsHash = new Map<string, string>();
		for (const message of sentMessages) {
			metrics.incrementStream({ success: message.status === 'fulfilled' });

			if (message.status === 'fulfilled' && message.value) {
				embedsHash.set(message.value.id, message.value.channelId);
			}
		}

		if (embedsHash.size > 0) {
			await this.container.redis.hmSet(YoutubeEmbedsKey(video.id), embedsHash);
		}
	}
}
