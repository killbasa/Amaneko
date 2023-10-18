import { HolodexMembersOnlyPatterns } from '#lib/utils/constants';
import { AmanekoEvents } from '#lib/utils/enums';
import { YoutubeNotifKey, YoutubePrechatNotifKey } from '#lib/utils/cache';
import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { container } from '@sapphire/framework';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<ScheduledTask.Options>({
	name: 'StreamTask',
	pattern: '0 */1 * * * *', // Every minute
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask {
	private readonly streamsKey = 'youtube:streams:list';
	private readonly subscribedStreamsKey = 'youtube:subscribed-streams:list';

	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { prisma, holodex, tldex, logger, redis, client, metrics } = container;

		await tracer.createSpan('process_streams', async () => {
			logger.debug('[StreamTask] Checking subscriptions');

			const timer = metrics.histograms.observeStream();

			const liveStreams = await tracer.createSpan('fetch_livestreams', async () => {
				return holodex.getLiveVideos({
					maxUpcoming: Time.Minute * 15
				});
			});

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

			const subscribedStreams: Holodex.VideoWithChannel[] = [];

			await tracer.createSpan('iterate_streams', async () => {
				for (const stream of liveStreams) {
					// Only relay non-member streams
					if (!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
						tldex.subscribe(stream);
					}

					if (channelIds.has(stream.channel.id)) {
						const availableAt = new Date(stream.available_at).getTime();
						subscribedStreams.push(stream);

						if (stream.status === 'live' || (stream.status === 'upcoming' && availableAt <= Date.now())) {
							if (availableAt >= Date.now() - Time.Minute * 15) {
								const notified = await redis.get<boolean>(YoutubeNotifKey(stream.id));

								if (!notified) {
									client.emit(AmanekoEvents.StreamStart, stream);
									await redis.set(YoutubeNotifKey(stream.id), true);
								}
							}
						} else if (stream.status === 'upcoming' && availableAt > Date.now()) {
							// Only relay non-member streams
							if (!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
								const notified = await redis.get<boolean>(YoutubePrechatNotifKey(stream.id));

								if (!notified) {
									client.emit(AmanekoEvents.StreamPrechat, stream);
									await redis.set(YoutubePrechatNotifKey(stream.id), true);
								}
							}
						}
					}
				}
			});

			timer.end({ streams: liveStreams.length });

			await this.cleanupAll(liveStreams);
			await this.cleanupSubscribed(channelIds, subscribedStreams);
		});
	}

	private async cleanupAll(liveStreams: Holodex.VideoWithChannel[]): Promise<void> {
		const { tldex, redis } = this.container;

		const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.streamsKey);

		const pastStreams = cachedStreams.filter(({ id }) => {
			return !liveStreams.some((stream) => stream.id === id);
		});

		const keysToDelete = [this.streamsKey];

		for (const stream of pastStreams) {
			tldex.unsubscribe(stream.id);
			keysToDelete.push(YoutubeNotifKey(stream.id));
		}

		await redis.deleteMany(keysToDelete);

		if (liveStreams.length > 0) {
			await redis.hmSet(
				this.streamsKey,
				new Map<string, Holodex.VideoWithChannel>(
					liveStreams.map((stream) => [stream.id, stream]) //
				)
			);
		}
	}

	private async cleanupSubscribed(channelIds: Set<string>, subscribedStreams: Holodex.VideoWithChannel[]): Promise<void> {
		const { prisma, redis, client } = this.container;

		const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.subscribedStreamsKey);

		const danglingStreamIds = cachedStreams //
			.filter(({ channel }) => !channelIds.has(channel.id))
			.map(({ id }) => id);

		const pastStreams = cachedStreams.filter(({ id }) => {
			return !danglingStreamIds.some((streamId) => streamId === id) && !subscribedStreams.some((stream) => stream.id === id);
		});

		for (const stream of pastStreams) {
			client.emit(AmanekoEvents.StreamEnd, stream);
		}

		if (danglingStreamIds.length > 0) {
			prisma.streamComment.deleteMany({
				where: { videoId: { in: danglingStreamIds } }
			});
		}

		await redis.delete(this.subscribedStreamsKey);

		if (subscribedStreams.length > 0) {
			await redis.hmSet(
				this.subscribedStreamsKey,
				new Map<string, Holodex.VideoWithChannel>(
					subscribedStreams.map((stream) => [stream.id, stream]) //
				)
			);
		}
	}
}
