import { ScrapeSchema } from '#lib/schemas/ScrapeSchema';
import { AmanekoEvents, AmanekoTasks } from '#lib/utils/enums';
import { sleep } from '#lib/utils/functions';
import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { FetchResultTypes, fetch } from '@sapphire/fetch';
import type { CommunityPostData } from '#lib/types/YouTube';

@ApplyOptions<ScheduledTask.Options>({
	name: AmanekoTasks.CommunityPost,
	pattern: '0 */5 * * * *', // Every 5 minutes
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask<typeof AmanekoTasks.CommunityPost> {
	public override async run(): Promise<void> {
		const { tracer, container } = this;
		const { client, logger, prisma, redis } = container;

		await tracer.createSpan(`community_posts`, async () => {
			const channelIds = await tracer.createSpan('find_channels', async () => {
				return prisma.subscription
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
								return await this.getLatestPost(channelId);
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

	private async getLatestPost(channelId: string): Promise<CommunityPostData | undefined> {
		const channelUrl = `https://www.youtube.com/channel/${channelId}/community`;
		const headers: Record<string, string> = { 'Accept-Language': 'en' };
		const page = await fetch(channelUrl, { headers }, FetchResultTypes.Text);

		const dataRegex = /(?<=var ytInitialData = )(.*?)(?=;<\/script>)/;

		const data = JSON.parse(page.match(dataRegex)?.at(0) ?? '');
		return this.parse(data, channelId);
	}

	private parse(ytData: any, channelId: string): CommunityPostData | undefined {
		const result = ScrapeSchema.parse(
			ytData.contents?.twoColumnBrowseResultsRenderer.tabs.filter((e: any) => e.tabRenderer) //
		);

		const communityTab = result.find((tab) => tab?.tabRenderer?.title === 'Community');
		const content = communityTab?.tabRenderer?.content;
		if (content === undefined) return undefined;

		const sectionList = content.sectionListRenderer?.contents.at(0);
		const sectionRenderer = sectionList?.itemSectionRenderer?.contents.at(0);
		const latestPost = sectionRenderer?.backstagePostThreadRenderer?.post.backstagePostRenderer;
		if (!latestPost) return undefined;

		const postContent = latestPost.contentText.runs;
		const postText = postContent.map((item) => item.text).join(' ');
		const truncated = postText.length < 2000 ? postText : `${postText.substring(0, 1999)}…`;
		const date = latestPost.publishedTimeText.runs[0].text;

		return {
			id: latestPost.postId,
			channelId,
			channelName: latestPost.authorText.runs[0].text,
			avatar: `https:${latestPost.authorThumbnail.thumbnails[2].url}`,
			url: `https://youtube.com/post/${latestPost.postId}`,
			content: truncated,
			isToday: ['day', 'week', 'month', 'year'].every((unit) => !date.includes(unit))
		};
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ScheduledTasks {
		[AmanekoTasks.CommunityPost]: undefined;
	}
}
