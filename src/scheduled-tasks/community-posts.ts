import { ScrapeSchema } from '#lib/schemas/ScrapeSchema';
import { AmanekoEvents } from '#lib/utils/Events';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { FetchResultTypes, fetch } from '@sapphire/fetch';
import type { CommunityPostData } from '#lib/types/YouTube';

@ApplyOptions<ScheduledTask.Options>({
	name: 'communityPosts',
	pattern: '0 */5 * * * *', // Every 5 minutes
	enabled: !container.config.isDev
})
export class Task extends ScheduledTask {
	public override async run(): Promise<void> {
		const channelIds = await this.container.prisma.subscription
			.groupBy({
				where: { NOT: { communityPostChannelId: null } },
				by: ['channelId']
			})
			.then((res) => res.map(({ channelId }) => channelId));

		for (const channelId of channelIds) {
			await this.sleep(2000);
			const post = await this.getLatestPost(channelId);
			if (!post?.isToday) continue;

			const notifiedPost = await this.container.prisma.communityPost.count({
				where: { id: post.id }
			});
			if (notifiedPost > 0) continue;

			this.container.client.emit(AmanekoEvents.CommunityPost, post);
		}
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async getLatestPost(channelId: string): Promise<CommunityPostData | undefined> {
		const channelUrl = `https://www.youtube.com/channel/${channelId}/community`;
		const headers: Record<string, string> = { 'Accept-Language': 'en' };
		const page = await fetch(channelUrl, { headers }, FetchResultTypes.Text);

		const dataRegex = /(?<=var ytInitialData = )(.*?)(?=;<\/script>)/;

		const data = JSON.parse(page.match(dataRegex)?.[0] ?? '');
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

		return latestPost
			? {
					id: latestPost.postId,
					channelId,
					channelName: latestPost.authorText.runs[0].text,
					avatar: `https:${latestPost.authorThumbnail.thumbnails[2].url}`,
					url: `https://youtube.com/post/${latestPost.postId}`,
					content: truncated,
					isToday: ['day', 'week', 'month', 'year'].every((unit) => !date.includes(unit))
			  }
			: undefined;
	}
}
