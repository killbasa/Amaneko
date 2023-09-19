import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, roleMention } from 'discord.js';
import type { APIEmbedField, Channel } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildWithSubscriptions } from '#lib/types/Discord';

@ApplyOptions<ScheduledTask.Options>({
	name: 'StreamTask',
	pattern: '0 */1 * * * *', // Every minute
	enabled: container.config.enableTasks
})
export class Task extends ScheduledTask {
	private readonly streamsKey = 'youtube:streams:list';

	public override async run(): Promise<void> {
		const { prisma, holodex, tldex, logger, redis } = this.container;

		logger.debug('[StreamTask] Checking subscriptions');

		const channelIds = await prisma.subscription
			.groupBy({
				where: {
					OR: [{ relayChannelId: { not: null } }, { discordChannelId: { not: null } }, { memberDiscordChannelId: { not: null } }]
				},
				by: ['channelId']
			})
			.then((res) => res.map(({ channelId }) => channelId));
		if (channelIds.length < 1) {
			tldex.unsubscribeAll();
			return;
		}

		const liveStreams = await holodex
			.getLiveVideos({
				channels: channelIds
			})
			.then((streams) =>
				streams.filter(({ available_at }) => {
					return new Date(available_at).getTime() < Date.now() + Time.Day * 3;
				})
			);

		const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.streamsKey);
		const danglingStreams = cachedStreams.filter(({ channel }) => {
			return !channelIds.includes(channel.id);
		});
		const pastStreams = cachedStreams.filter(({ id }) => {
			return !danglingStreams.some((stream) => stream.id === id) && !liveStreams.some((stream) => stream.id === id);
		});

		logger.debug(`[StreamTask] ${liveStreams.length} live/upcoming, ${danglingStreams.length} dangling, ${pastStreams.length} past`);

		for (const stream of liveStreams) {
			if (stream.topic_id && HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
				continue;
			}

			const availableAt = new Date(stream.available_at).getTime();
			if (stream.status === 'live' || (stream.status === 'upcoming' && availableAt < Date.now())) {
				tldex.subscribe(stream);

				const notificationSent = await redis.get<boolean>(this.notificationKey(stream.id));

				if (!notificationSent && availableAt > Date.now() - Time.Minute * 1000) {
					await this.sendRelayNotification(stream);
					await this.sendLivestreamNotification(stream);
					await redis.set(this.notificationKey(stream.id), true);
				}
			}
		}

		const upcomingStreams = liveStreams.filter((stream) => stream.status === 'upcoming' && new Date(stream.available_at).getTime() > Date.now());
		const scheduledGuilds = await prisma.guild.findMany({
			where: { scheduleMessageId: { not: null }, scheduleChannelId: { not: null } },
			select: { id: true, scheduleChannelId: true, scheduleMessageId: true, subscriptions: true }
		});

		if (scheduledGuilds.length > 0 && upcomingStreams.length > 0) {
			await this.handleStreamSchedule(upcomingStreams, scheduledGuilds);
		} else if (scheduledGuilds.length > 0 && upcomingStreams.length === 0) {
			for (const guild of scheduledGuilds) {
				await this.handleNoScheduledStreams(guild);
			}
		}

		const keysToDelete = [this.streamsKey];

		for (const stream of pastStreams) {
			tldex.unsubscribe(stream.id);
			keysToDelete.push(this.notificationKey(stream.id));
			keysToDelete.push(this.embedsKey(stream.id));
			const embeds = await this.container.redis.hGetAll<string>(this.embedsKey(stream.id));
			await this.endLivestreamHandler(embeds);
		}

		for (const stream of danglingStreams) {
			tldex.unsubscribe(stream.id);
			keysToDelete.push(this.notificationKey(stream.id));
		}

		await redis.deleteMany(keysToDelete);

		if (liveStreams.length > 0) {
			await redis.hmSet(
				this.streamsKey,
				new Map<string, Holodex.VideoWithChannel>(
					liveStreams.map((stream) => [stream.id, stream]) //
				)
			);
		} else {
			await redis.delete(this.streamsKey);
		}
	}

	private async sendLivestreamNotification(video: Holodex.VideoWithChannel): Promise<void> {
		const membersStream = video.topic_id === 'membersonly';
		const subscriptions = await this.container.prisma.subscription.findMany({
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
					discordChannel = await this.container.client.channels.fetch(memberDiscordChannelId);
					if (memberRoleId) {
						role = `${roleMention(memberRoleId)} `;
						allowedRoles.push(`${memberRoleId}`);
					}
				} else if (discordChannelId) {
					discordChannel = await this.container.client.channels.fetch(discordChannelId);
					if (roleId) {
						role = `${roleMention(roleId)} `;
						allowedRoles.push(roleId);
					}
				}

				if (!discordChannel || !discordChannel.isTextBased()) {
					return;
				}

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
			if (message.status === 'fulfilled' && message.value) {
				embedsHash.set(message.value.id, message.value.channelId);
			}
		}

		if (embedsHash.size > 0) {
			await this.container.redis.hmSet(this.embedsKey(video.id), embedsHash);
		}
	}

	private async endLivestreamHandler(embeds: Map<string, string>): Promise<void> {
		await Promise.allSettled(
			Array.from(embeds).map(async ([messageId, channelId]) => {
				const discordChannel = await this.container.client.channels.fetch(channelId);
				if (!discordChannel || !discordChannel.isTextBased()) {
					return;
				}

				const embedMessage = await discordChannel.messages.fetch(messageId).catch(() => null);
				if (!embedMessage) {
					return;
				}

				await embedMessage.delete();
			})
		);
	}

	private async handleStreamSchedule(upcomingStreams: Holodex.VideoWithChannel[], guilds: GuildWithSubscriptions[]): Promise<void> {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Upcoming Streams')
			.setFooter({ text: `Powered by Holodex` })
			.setTimestamp();

		const result = await Promise.allSettled(
			guilds.map(async (guild) => {
				const guildUpcomingStreams = upcomingStreams //
					.filter((stream) => guild.subscriptions.some((sub) => sub.channelId === stream.channel.id))
					.sort((a, b) => new Date(a.available_at).getTime() - new Date(b.available_at).getTime());

				const redisParse = JSON.parse((await this.container.redis.get(this.scheduleKey(guild.id))) ?? 'true');
				const didUpdate = redisParse === true ? true : redisParse.toString() !== guildUpcomingStreams.map((stream) => stream.id).toString();
				if (!didUpdate) {
					return null;
				}

				const streamFields: APIEmbedField[] = guildUpcomingStreams.map((stream) => ({
					name: `**${stream.channel.name}**`,
					value: `[${stream.title}](https://youtu.be/${stream.id}) <t:${new Date(stream.available_at).getTime() / 1000}:R>`
				}));

				embed.setFields(streamFields);

				const scheduleChannel = await this.container.client.channels.fetch(guild.scheduleChannelId!).catch(() => null);
				if (!scheduleChannel || !scheduleChannel.isTextBased()) {
					return null;
				}
				const scheduleMessage = await scheduleChannel.messages.fetch(guild.scheduleMessageId!).catch(() => null);
				if (!scheduleMessage) {
					const message = await scheduleChannel.send({
						embeds: [embed]
					});
					await this.container.prisma.guild.update({
						where: { id: guild.id },
						data: {
							scheduleMessageId: message.id
						}
					});

					return { guildId: guild.id, videoIds: guildUpcomingStreams.map((stream) => stream.id) };
				}
				await scheduleMessage.edit({
					embeds: [embed]
				});

				return { guildId: guild.id, videoIds: guildUpcomingStreams.map((stream) => stream.id) };
			})
		);

		for (const promise of result) {
			if (promise.status === 'fulfilled' && promise.value) {
				await this.container.redis.set(this.scheduleKey(promise.value.guildId), JSON.stringify(promise.value.videoIds));
			}
		}
	}

	private async handleNoScheduledStreams(guild: GuildWithSubscriptions): Promise<void> {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Upcoming Streams')
			.setFooter({ text: `Powered by Holodex` })
			.setTimestamp();

		const scheduleChannel = await this.container.client.channels.fetch(guild.scheduleChannelId!).catch(() => null);
		if (scheduleChannel && scheduleChannel.isTextBased()) {
			const message = await scheduleChannel.messages.fetch(guild.scheduleMessageId!).catch(() => null);
			if (message) {
				await message.edit({
					embeds: [embed]
				});
			} else {
				const message = await scheduleChannel.send({
					embeds: [embed]
				});

				await this.container.prisma.guild.update({
					where: { id: guild.id },
					data: {
						scheduleMessageId: message.id
					}
				});
			}

			await this.container.redis.delete(this.scheduleKey(guild.id));
		}
	}

	private async sendRelayNotification(video: Holodex.VideoWithChannel): Promise<void> {
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

		const subscriptions = await container.prisma.subscription.findMany({
			where: { channelId: video.channel.id, relayChannelId: { not: null } },
			select: { relayChannelId: true }
		});

		await Promise.allSettled(
			subscriptions.map(async ({ relayChannelId }) => {
				if (!relayChannelId) return;

				const discordChannel = await container.client.channels.fetch(relayChannelId!);
				if (!discordChannel?.isTextBased()) return;

				return discordChannel.send({
					embeds: [embed],
					components: [components]
				});
			})
		);
	}

	private readonly notificationKey = (streamId: string): string => `youtube:streams:${streamId}:notified`;
	private readonly embedsKey = (streamId: string): string => `youtube:streams:${streamId}:embeds`;
	private readonly scheduleKey = (guildId: string): string => `discord:guild:${guildId}:videos`;
}
