import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { YoutubeScheduleKey } from '#lib/utils/cache';
import { BrandColors } from '#lib/utils/constants';
import { arrayIsEqual } from '#lib/utils/functions';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { Time } from '@sapphire/duration';
import { EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';
import type { GuildWithSubscriptions } from '#lib/types/Discord';
import type { APIEmbedField } from 'discord.js';

@ApplyOptions<ScheduledTask.Options>({
	name: 'StreamTask',
	pattern: '0 */5 * * * *', // Every 5 minutes
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask {
	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { prisma, holodex } = container;

		const channelIds = await prisma.subscription
			.groupBy({
				where: {
					OR: [{ discordChannelId: { not: null } }, { memberDiscordChannelId: { not: null } }]
				},
				by: ['channelId']
			})
			.then((res) => res.map(({ channelId }) => channelId));
		if (channelIds.length === 0) return;

		const liveStreams = await holodex.getLiveVideos({
			channels: channelIds,
			maxUpcoming: Time.Day * 5
		});

		const upcomingStreams = liveStreams.filter((stream) => {
			return stream.status === 'upcoming' && new Date(stream.available_at).getTime() > Date.now();
		});

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
