import { YoutubeEmojiRegex } from '#lib/utils/constants';
import { YoutubeDataSchema } from '#lib/schemas/YoutubeDataSchema';
import { ScrapeSchema } from '#lib/schemas/ScrapeSchema';
import { container } from '@sapphire/framework';
import { FetchResultTypes, fetch } from '@sapphire/fetch';
import type { YoutubeData } from '#lib/schemas/YoutubeDataSchema';
import type { CommunityPostData } from '#lib/types/YouTube';

export const getUsername = async (id: string): Promise<string> => {
	try {
		const { data } = await container.youtube.channels.list({
			part: ['snippet,contentDetails,statistics'],
			id: [id]
		});
		const channelData: YoutubeData = YoutubeDataSchema.parse(data);

		return channelData.items[0].snippet.title;
	} catch (err) {
		return 'Username not found';
	}
};

export function channelLink(name: string, id: string): string {
	return `[${name}](https://www.youtube.com/channel/${id})`;
}

export function videoLink(videoId: string): string {
	return `https://youtu.be/${videoId}`;
}

export function cleanEmojis(context: string): string {
	return context.replace(YoutubeEmojiRegex, '');
}

export const CommunityPostRegex = /(?<=var ytInitialData = )(.*?)(?=;<\/script>)/;

export async function getLatestCommunityPost(channelId: string): Promise<CommunityPostData | undefined> {
	const page = await fetch(
		`https://www.youtube.com/channel/${channelId}/community`,
		{
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
				'Accept-Language': 'en'
			}
		},
		FetchResultTypes.Text
	);

	const matches = page.match(CommunityPostRegex)?.at(0);
	if (!matches) return undefined;

	const data = JSON.parse(matches);
	return parseCommunityPost(data, channelId);
}

export function parseCommunityPost(ytData: unknown, channelId: string): CommunityPostData | undefined {
	const parsed = ScrapeSchema.parse(ytData);

	const communityTab = parsed.contents?.twoColumnBrowseResultsRenderer?.tabs?.find((tab) => {
		return tab?.tabRenderer?.title === 'Community';
	});
	const content = communityTab?.tabRenderer?.content;
	if (content === undefined) return undefined;

	const sectionList = content.sectionListRenderer?.contents?.at(0);
	const sectionRenderer = sectionList?.itemSectionRenderer?.contents?.at(0);
	const latestPost = sectionRenderer?.backstagePostThreadRenderer?.post.backstagePostRenderer;
	const postContent = latestPost?.contentText?.runs;
	if (!postContent) return undefined;

	const postText: string = postContent.map((item) => item.text).join(' ');
	const truncated: string = postText.length < 2000 ? postText : `${postText.substring(0, 1999)}…`;
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
