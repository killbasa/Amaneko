import { AmanekoTask } from '../lib/extensions/AmanekoTask.js';
import { AmanekoEvents, AmanekoTasks } from '../lib/utils/enums.js';
import { sleep } from '../lib/utils/functions.js';
import { getLatestCommunityPost } from '../lib/utils/youtube.js';
import { container } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

@ApplyOptions<ScheduledTask.Options>({
	name: AmanekoTasks.CommunityPost,
	pattern: '0 */5 * * * *', // Every 5 minutes
	enabled: container.config.enableTasks,
	customJobOptions: {
		jobId: `tasks:${AmanekoTasks.CommunityPost}`
	}
})
export class Task extends AmanekoTask<typeof AmanekoTasks.CommunityPost> {
	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { client, logger, prisma, redis } = container;

		await tracer.createSpan(`community_posts`, async () => {
			const channelIds = await tracer.createSpan('find_channels', async () => {
				return await prisma.subscription
					.groupBy({
						where: { NOT: { communityPostChannelId: null } },
						by: ['channelId']
					})
					.then((res) => res.map(({ channelId }) => channelId));
			});
			if (channelIds.length === 0) return;

			logger.debug(`[CommunityPosts] Checking community posts for ${channelIds.length} channels`);

			await tracer.createSpan('process_channels', async () => {
				for (const channelId of channelIds) {
					try {
						await tracer.createSpan(`process_channel:${channelId}`, async () => {
							logger.debug(`[CommunityPosts] Checking posts for ${channelId}`);

							const post = await tracer.createSpan(`process_channel:${channelId}:scrape`, async () => {
								const result = await getLatestCommunityPost(channelId);
								return result;
							});
							if (!post?.isToday) return;

							const savedPostId = await redis.hGet<string>('communityposts', channelId);
							if (savedPostId === post.id) return;

							client.emit(AmanekoEvents.CommunityPost, post);
						});
					} catch (err: unknown) {
						logger.error(`[CommunityPosts] Error while processing channel ${channelId}`, err);
					} finally {
						await sleep(2000);
					}
				}
			});
		});
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ScheduledTasks {
		[AmanekoTasks.CommunityPost]: undefined;
	}
}
