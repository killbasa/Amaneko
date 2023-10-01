import { YoutubeDataSchema } from '#lib/schemas/YoutubeDataSchema';
import { google } from 'googleapis';
import { container } from '@sapphire/pieces';
import type { YoutubeData } from '#lib/schemas/YoutubeDataSchema';

const youtube = google.youtube({ version: 'v3', auth: container.config.youtube.apikey });

export const getUsername = async (id: string): Promise<string> => {
	try {
		const { data } = await youtube.channels.list({
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
