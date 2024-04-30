import { AmanekoTask } from '../lib/extensions/AmanekoTask.js';
import { HolodexMembersOnlyPatterns } from '../lib/utils/constants.js';
import { AmanekoTasks } from '../lib/utils/enums.js';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { container } from '@sapphire/framework';
import type { Holodex } from '../lib/types/Holodex.js';

@ApplyOptions<ScheduledTask.Options>({
	name: AmanekoTasks.Streams,
	pattern: '0 */1 * * * *', // Every minute
	enabled: container.config.enableTasks,
	customJobOptions: {
		jobId: AmanekoTasks.Streams
	}
})
export class Task extends AmanekoTask<typeof AmanekoTasks.Streams> {
	private readonly streamsKey = 'youtube:streams:list';

	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { holodex, tldex, logger, redis } = container;

		await tracer.createSpan('process_streams', async () => {
			logger.debug('[StreamTask] Checking streams');

			const liveStreams = await tracer.createSpan('fetch_streams', async () => {
				return await holodex.getVideos({
					maxUpcoming: Time.Minute * 15
				});
			});

			await tracer.createSpan('iterate_streams', async () => {
				for (const stream of liveStreams) {
					// Only relay non-member streams
					if (!stream.topic_id || !HolodexMembersOnlyPatterns.includes(stream.topic_id)) {
						await tldex.subscribe(stream);
					}
				}
			});

			await tracer.createSpan('cleanup_streams', async () => {
				const cachedStreams = await redis.hGetValues<Holodex.VideoWithChannel>(this.streamsKey);

				const pastStreams = cachedStreams.filter(({ id }) => {
					return !liveStreams.some((stream) => stream.id === id);
				});

				for (const stream of pastStreams) {
					tldex.unsubscribe(stream.id);
				}

				await redis.delete(this.streamsKey);

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

declare module '@sapphire/plugin-scheduled-tasks' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ScheduledTasks {
		[AmanekoTasks.Streams]: undefined;
	}
}
