import { cache } from '../mocks/cache';
import { FetchResultTypes, fetch } from '@sapphire/fetch';
import { CommunityPostRegex, parseCommunityPost } from '#src/lib/utils/youtube';
import { ScrapeSchema } from '#src/lib/schemas/ScrapeSchema';

describe('community posts', () => {
	test.each([
		'UCZlDXzGoo7d44bwdNObFacg', //
		'UCajbFh6e_R8QZdHAMbbi4rQ',
		'UCJv02SHZgav7Mv3V0kBOR8Q'
	])('test %s', async (channelId) => {
		const html = await cache(`${channelId}.html`, undefined, async () => {
			return await fetch(
				`https://www.youtube.com/channel/${channelId}/community`,
				{
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
						'Accept-Language': 'en'
					}
				},
				FetchResultTypes.Text
			);
		});

		const match = html.match(CommunityPostRegex)?.at(0);
		if (match === undefined) {
			throw new Error('No matches found');
		}

		const data = JSON.parse(match);
		const parsed = ScrapeSchema.parse(data);

		let result = undefined;
		try {
			result = parseCommunityPost(parsed, channelId);
		} catch (err) {
			console.error(err);
		}

		expect(result).not.toBe(undefined);
	});
});
