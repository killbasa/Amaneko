import { AmanekoNotifier } from '../lib/extensions/AmanekoNotifier.js';
import { YoutubeEmbedsKey } from '../lib/utils/cache.js';
import { BrandColors, HolodexMembersOnlyPatterns } from '../lib/utils/constants.js';
import { AmanekoEvents } from '../lib/utils/enums.js';
import { canSendGuildMessages } from '../lib/utils/permissions.js';
import { videoLink } from '../lib/utils/youtube.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, roleMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '../lib/types/Holodex.js';
import type { Channel } from 'discord.js';

@ApplyOptions<AmanekoNotifier.Options>({
	name: AmanekoEvents.StreamStart,
	event: AmanekoEvents.StreamStart
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamStart> {
	public async process(video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { prisma } = container;

		const subscriptions = await tracer.createSpan('find_subscriptions', async () => {
			return await prisma.subscription.findMany({
				where: {
					channelId: video.channel.id,
					OR: [{ discordChannelId: { not: null } }, { memberDiscordChannelId: { not: null } }]
				},
				select: { guildId: true, discordChannelId: true, memberDiscordChannelId: true, roleId: true, memberRoleId: true }
			});
		});
		if (subscriptions.length === 0) return this.none();

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({
				name: video.channel.name,
				iconURL: video.channel.photo,
				url: `https://www.youtube.com/channel/${video.channel.id}`
			})
			.setTitle(video.title)
			.setURL(videoLink(video.id))
			.setThumbnail(video.channel.photo)
			.setImage(`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`)
			.setDescription(video.description?.slice(0, 50) ?? null)
			.setFooter({ text: `Powered by Holodex` })
			.setTimestamp();

		const components = new ActionRowBuilder<ButtonBuilder>().setComponents([
			new ButtonBuilder() //
				.setStyle(ButtonStyle.Link)
				.setURL(videoLink(video.id))
				.setLabel('Watch Stream')
		]);

		const isMemberStream: boolean = video.topic_id //
			? HolodexMembersOnlyPatterns.includes(video.topic_id)
			: false;

		return this.some({
			video,
			subscriptions,
			embed,
			components,
			isMemberStream
		});
	}

	public async send({ video, subscriptions, embed, components, isMemberStream }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { client, metrics } = container;

		const messages = await Promise.allSettled(
			subscriptions.map(async ({ guildId, discordChannelId, memberDiscordChannelId, roleId, memberRoleId }) => {
				return await tracer.createSpan(`process_subscription:${guildId}`, async () => {
					let discordChannel: Channel | null = null;
					let role = '';
					const allowedRoles: string[] = [];

					if (isMemberStream && memberDiscordChannelId) {
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

					if (!canSendGuildMessages(discordChannel)) return;

					return await discordChannel.send({
						content: `${role}${video.channel.name} is now live!`,
						allowedMentions: { roles: allowedRoles },
						embeds: [embed],
						components: [components]
					});
				});
			})
		);

		const embedsHash = new Map<string, string>();
		for (const message of messages) {
			metrics.counters.incStreamNotif({ success: message.status === 'fulfilled' });

			if (message.status === 'fulfilled' && message.value) {
				embedsHash.set(message.value.id, message.value.channelId);
			}
		}

		if (embedsHash.size > 0) {
			await this.container.redis.hmSet(YoutubeEmbedsKey(video.id), embedsHash);
		}
	}
}
