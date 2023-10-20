import { HolodexMembersOnlyPatterns } from '#lib/utils/constants';
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

	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { holodex, tldex, logger, redis, metrics } = container;

		await tracer.createSpan('process_streams', async () => {
			logger.debug('[StreamTask] Checking streams');

			const timer = metrics.histograms.observeStream();

			const liveStreams = await tracer.createSpan('fetch_streams', async () => {
				return holodex.getVideos({
					maxUpcoming: Time.Minute * 15
				});
			});

			await tracer.createSpan('iterate_streams', async () => {
				for (const stream of liveStreams) {
					// Only relay non-member streams
					if (!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
						tldex.subscribe(stream);
					}
				}
			});

			timer.end({ streams: liveStreams.length });

			await tracer.createSpan('cleanup_streams', async () => {
				const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.streamsKey);

				const pastStreams = cachedStreams.filter(({ id }) => {
					return !liveStreams.some((stream) => stream.id === id);
				});

				for (const stream of pastStreams) {
					tldex.unsubscribe(stream.id);
				}

				await redis.deleteMany(this.streamsKey);

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
}
