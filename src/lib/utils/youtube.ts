import { YoutubeEmojiRegex } from '#lib/utils/constants';
import { YoutubeDataSchema } from '#lib/schemas/YoutubeDataSchema';
import { container } from '@sapphire/pieces';
import type { YoutubeData } from '#lib/schemas/YoutubeDataSchema';

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
