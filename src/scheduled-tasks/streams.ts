import { BrandColors, HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { container } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { Holodex } from '#lib/types/Holodex';

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
				where: { relayChannelId: { not: null } },
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
					return new Date(available_at).getTime() < Date.now() + Time.Hour;
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

				if (!notificationSent && availableAt > Date.now() - Time.Minute * 15) {
					await this.sendRelayNotification(stream);
					await redis.set(this.notificationKey(stream.id), true);
				}
			}
		}

		const keysToDelete = [this.streamsKey];

		for (const stream of pastStreams) {
			tldex.unsubscribe(stream.id);
			keysToDelete.push(this.notificationKey(stream.id));
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
}
