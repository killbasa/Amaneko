import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { YoutubeNotifKey, YoutubePrechatNotifKey, YoutubeScheduleKey } from '#lib/utils/cache';
import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { arrayIsEqual } from '#lib/utils/functions';
import { AmanekoEvents } from '#lib/utils/enums';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { Time } from '@sapphire/duration';
import { EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildWithSubscriptions } from '#lib/types/Discord';
import type { APIEmbedField } from 'discord.js';

@ApplyOptions<ScheduledTask.Options>({
	name: 'SubscribedStreamTask',
	pattern: '0 */1 * * * *', // Every minute
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask {
	private readonly subscribedStreamsKey = 'youtube:subscribed-streams:list';

	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { prisma, holodex, redis, client, logger } = container;

		await tracer.createSpan('process_subscribed_streams', async () => {
			logger.debug('[SubscribedStreamTask] Checking subscribed streams');

			const channelIds = await tracer.createSpan('find_channelids', async () => {
				const ids = await prisma.subscription.groupBy({
					where: {
						OR: [
							{ relayChannelId: { not: null } }, //
							{ discordChannelId: { not: null } },
							{ memberDiscordChannelId: { not: null } }
						]
					},
					by: ['channelId']
				});

				return new Set<string>(ids.map(({ channelId }) => channelId));
			});
			if (channelIds.size === 0) return;

			const upcomingStreams: Holodex.VideoWithChannel[] = [];
			const liveStreams = await tracer.createSpan('fetch_streams', async () => {
				return holodex.getLiveVideos({
					channels: channelIds,
					maxUpcoming: Time.Day * 5
				});
			});

			await tracer.createSpan('iterate_streams', async () => {
				for (const stream of liveStreams) {
					const availableAt = new Date(stream.available_at).getTime();

					if (stream.status === 'upcoming' && availableAt > Date.now()) {
						upcomingStreams.push(stream);

						// Only relay non-member streams
						if (
							availableAt <= Date.now() + Time.Minute * 15 && //
							(!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id))
						) {
							const notified = await redis.get<boolean>(YoutubePrechatNotifKey(stream.id));

							if (!notified) {
								client.emit(AmanekoEvents.StreamPrechat, stream);
								await redis.set(YoutubePrechatNotifKey(stream.id), true);
							}
						}
					} else if (stream.status === 'live' || (stream.status === 'upcoming' && availableAt <= Date.now())) {
						if (availableAt >= Date.now() - Time.Minute * 15) {
							const notified = await redis.get<boolean>(YoutubeNotifKey(stream.id));

							if (!notified) {
								client.emit(AmanekoEvents.StreamStart, stream);
								await redis.set(YoutubeNotifKey(stream.id), true);
							}
						}
					}
				}
			});

			await tracer.createSpan('scheduled_livestreams', async () => {
				const scheduledGuilds = await prisma.guild.findMany({
					where: { scheduleMessageId: { not: null }, scheduleChannelId: { not: null } },
					select: { id: true, scheduleChannelId: true, scheduleMessageId: true, subscriptions: true }
				});

				if (scheduledGuilds.length > 0) {
					if (upcomingStreams.length > 0) {
						await tracer.createSpan('scheduled_livestreams:some', async () => {
							await this.handleScheduledStreams(upcomingStreams, scheduledGuilds);
						});
					} else {
						await tracer.createSpan('scheduled_livestreams:none', async () => {
							await this.handleNoScheduledStreams(scheduledGuilds);
						});
					}
				}
			});

			await this.cleanup(channelIds, liveStreams);
		});
	}

	private async handleScheduledStreams(upcomingStreams: Holodex.VideoWithChannel[], guilds: GuildWithSubscriptions[]): Promise<void> {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Upcoming Streams')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();

		await Promise.allSettled(
			guilds.map(async (guild) => {
				await this.tracer.createSpan(`scheduled_livestreams:some:${guild.id}`, async () => {
					const guildUpcomingStreams = upcomingStreams //
						.filter((stream) => guild.subscriptions.some((subscription) => subscription.channelId === stream.channel.id))
						.sort((streamOne, streamTwo) => {
							return new Date(streamOne.available_at).getTime() - new Date(streamTwo.available_at).getTime();
						});

					const redisParse = (await this.container.redis.get<string[]>(YoutubeScheduleKey(guild.id))) ?? [];
					const didUpdate = arrayIsEqual(
						redisParse,
						guildUpcomingStreams.map((stream) => stream.id)
					);
					if (didUpdate) return;

					const streamFields: APIEmbedField[] = guildUpcomingStreams.map((stream) => ({
						name: `**${stream.channel.name}**`,
						value: `[${stream.title}](https://youtu.be/${stream.id}) <t:${new Date(stream.available_at).getTime() / 1000}:R>`
					}));

					const scheduleChannel = await this.container.client.channels.fetch(guild.scheduleChannelId!);
					if (!canSendGuildMessages(scheduleChannel)) return;

					const guildEmbed = EmbedBuilder.from(embed).setFields(streamFields);
					const scheduleMessage = await scheduleChannel.messages.fetch(guild.scheduleMessageId!).catch(() => null);

					if (scheduleMessage) {
						await scheduleMessage.edit({
							embeds: [guildEmbed]
						});
					} else {
						const message = await scheduleChannel.send({
							embeds: [guildEmbed]
						});
						await this.container.prisma.guild.update({
							where: { id: guild.id },
							data: {
								scheduleMessageId: message.id
							}
						});
					}

					return this.container.redis.set<string[]>(
						YoutubeScheduleKey(guild.id),
						guildUpcomingStreams.map((stream) => stream.id)
					);
				});
			})
		);
	}

	private async handleNoScheduledStreams(guilds: GuildWithSubscriptions[]): Promise<void> {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Upcoming Streams')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();

		await Promise.allSettled(
			guilds.map(async (guild) => {
				await this.tracer.createSpan(`scheduled_livestreams:none:${guild.id}`, async () => {
					const guildScheduledVideosCache = await this.container.redis.get<string[]>(YoutubeScheduleKey(guild.id));
					if (guildScheduledVideosCache === null || guildScheduledVideosCache.length === 0) {
						return;
					}

					const scheduleChannel = await this.container.client.channels.fetch(guild.scheduleChannelId!);
					if (!canSendGuildMessages(scheduleChannel)) return;

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

					return this.container.redis.delete(YoutubeScheduleKey(guild.id));
				});
			})
		);
	}

	private async cleanup(channelIds: Set<string>, subscribedStreams: Holodex.VideoWithChannel[]): Promise<void> {
		const { prisma, redis, client } = this.container;

		await this.tracer.createSpan('cleanup_streams', async () => {
			const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.subscribedStreamsKey);

			const danglingStreamIds = cachedStreams //
				.filter(({ channel }) => !channelIds.has(channel.id))
				.map(({ id }) => id);

			const pastStreams = cachedStreams.filter(({ id }) => {
				return !danglingStreamIds.some((streamId) => streamId === id) && !subscribedStreams.some((stream) => stream.id === id);
			});

			const keysToDelete: string[] = [this.subscribedStreamsKey];

			for (const stream of pastStreams) {
				client.emit(AmanekoEvents.StreamEnd, stream);
				keysToDelete.push(YoutubePrechatNotifKey(stream.id), YoutubePrechatNotifKey(stream.id));
			}

			for (const streamId of danglingStreamIds) {
				keysToDelete.push(YoutubePrechatNotifKey(streamId), YoutubePrechatNotifKey(streamId));
			}

			if (danglingStreamIds.length > 0) {
				prisma.streamComment.deleteMany({
					where: { videoId: { in: danglingStreamIds } }
				});
			}

			await redis.deleteMany(keysToDelete);

			if (subscribedStreams.length > 0) {
				await redis.hmSet(
					this.subscribedStreamsKey,
					new Map<string, Holodex.VideoWithChannel>(
						subscribedStreams.map((stream) => [stream.id, stream]) //
					)
				);
			}
		});
	}
}
