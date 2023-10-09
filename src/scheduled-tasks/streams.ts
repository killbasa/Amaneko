import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { arrayIsEqual } from '#lib/utils/functions';
import { AmanekoEvents } from '#lib/utils/enums';
import { YoutubeEmbedsKey, YoutubeNotifKey, YoutubePrechatNotifKey, YoutubeScheduleKey } from '#lib/utils/cache';
import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { container } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import type { APIEmbedField } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildWithSubscriptions } from '#lib/types/Discord';

@ApplyOptions<ScheduledTask.Options>({
	name: 'StreamTask',
	pattern: '0 */1 * * * *', // Every minute
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask {
	private readonly streamsKey = 'youtube:streams:list';

	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { prisma, holodex, tldex, logger, redis, client, metrics } = container;

		await tracer.createSpan('process_stream', async () => {
			logger.debug('[StreamTask] Checking subscriptions');

			const timer = metrics.histograms.observeStream();

			const channelIds = await tracer.createSpan('find_channelids', async () => {
				return prisma.subscription
					.groupBy({
						where: {
							OR: [
								{ relayChannelId: { not: null } }, //
								{ discordChannelId: { not: null } },
								{ memberDiscordChannelId: { not: null } }
							]
						},
						by: ['channelId']
					})
					.then((res) => res.map(({ channelId }) => channelId));
			});
			if (channelIds.length === 0) {
				tldex.unsubscribeAll();
				return;
			}

			const liveStreams = await tracer.createSpan('fetch_livestreams', async () => {
				return holodex.getLiveVideos({
					channels: channelIds,
					maxUpcoming: Time.Day * 5
				});
			});

			const upcomingStreams: Holodex.VideoWithChannel[] = [];
			const { danglingStreams, pastStreams } = await tracer.createSpan(
				'sort_livestreams',
				async (): Promise<{
					danglingStreams: Holodex.VideoWithChannel[];
					pastStreams: Holodex.VideoWithChannel[];
				}> => {
					const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.streamsKey);

					// Streams that have no subscribers
					const danglingStreams = cachedStreams.filter(({ channel }) => {
						return !channelIds.includes(channel.id);
					});

					return {
						danglingStreams,
						// Streams that were cached but not in the Holodex fetch
						pastStreams: cachedStreams.filter(({ id }) => {
							return !danglingStreams.some((stream) => stream.id === id) && !liveStreams.some((stream) => stream.id === id);
						})
					};
				}
			);

			logger.debug(`[StreamTask] ${liveStreams.length} live/upcoming, ${danglingStreams.length} dangling, ${pastStreams.length} past`);

			await tracer.createSpan('process_livestreams', async () => {
				await tracer.createSpan('process_livestreams:iterate', async () => {
					for (const stream of liveStreams) {
						const availableAt = new Date(stream.available_at).getTime();

						if (stream.status === 'live' || (stream.status === 'upcoming' && availableAt <= Date.now())) {
							await tracer.createSpan(`process_livestreams:${stream.id}:live`, async () => {
								// Only relay non-member streams
								if (!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
									tldex.subscribe(stream);
								}

								if (availableAt >= Date.now() - Time.Minute * 15) {
									const notified = await redis.get<boolean>(YoutubeNotifKey(stream.id));

									if (!notified) {
										client.emit(AmanekoEvents.StreamStart, stream);
										await redis.set(YoutubeNotifKey(stream.id), true);
									}
								}
							});
						} else if (stream.status === 'upcoming' && availableAt > Date.now()) {
							await tracer.createSpan(`process_livestreams:${stream.id}:upcoming`, async () => {
								upcomingStreams.push(stream);

								// Only relay non-member streams
								if (
									availableAt <= Date.now() + Time.Minute * 15 && //
									(!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id))
								) {
									const prechatNotified = await redis.get<boolean>(YoutubePrechatNotifKey(stream.id));

									if (!prechatNotified) {
										client.emit(AmanekoEvents.StreamPrechat, stream);
										await redis.set(YoutubePrechatNotifKey(stream.id), true);
									}
								}
							});
						}
					}
				});
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

			timer.end({ streams: liveStreams.length });

			await tracer.createSpan('cleanup_livestreams', async () => {
				const keysToDelete = [this.streamsKey];
				const danglingStreamIds = danglingStreams.map(({ id }) => id);

				for (const stream of pastStreams) {
					tldex.unsubscribe(stream.id);
					keysToDelete.push(YoutubeNotifKey(stream.id), YoutubeEmbedsKey(stream.id));

					client.emit(AmanekoEvents.StreamEnd, stream);
				}

				for (const streamId of danglingStreamIds) {
					tldex.unsubscribe(streamId);
					keysToDelete.push(YoutubeNotifKey(streamId));
				}

				await Promise.all([
					prisma.streamComment.deleteMany({
						where: { videoId: { in: danglingStreamIds } }
					}),
					redis.deleteMany(keysToDelete)
				]);

				if (liveStreams.length > 0) {
					await redis.hmSet(
						this.streamsKey,
						new Map<string, Holodex.VideoWithChannel>(
							liveStreams.map((stream) => [stream.id, stream]) //
						)
					);
				}
			});
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
					if (!scheduleChannel?.isTextBased()) return;

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
					if (!scheduleChannel?.isTextBased()) return;

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
}
