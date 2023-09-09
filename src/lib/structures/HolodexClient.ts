import { HOLODEX_BASE_URL, HOLODEX_HEADER } from '#lib/utils/constants';
import { FetchMethods, FetchResultTypes, fetch } from '@sapphire/fetch';
import type { Holodex } from '#lib/types/Holodex';

export class HolodexClient {
	private readonly apiKey;

	public constructor(options: { apiKey: string }) {
		this.apiKey = options.apiKey;
	}

	public async getChannels(query: { limit?: number; offset?: number } = {}): Promise<Holodex.Channel[]> {
		const { limit = 100, offset = 0 } = query;

		const url = new URL(`${HOLODEX_BASE_URL}/channels`);
		url.searchParams.append('type', 'vtuber');
		url.searchParams.append('limit', `${limit}`);
		url.searchParams.append('offset', `${offset}`);

		return this.fetch<Holodex.Channel[]>(url, this.apiKey);
	}

	public async getLiveVideos(query: { channels: string[] }): Promise<Holodex.VideoWithChannel[]> {
		const url = new URL(`${HOLODEX_BASE_URL}/users/live`);
		url.searchParams.append('channels', query.channels.toString());

		return this.fetch<Holodex.VideoWithChannel[]>(url, this.apiKey);
	}

	private async fetch<T = unknown>(url: URL, apiKey: string): Promise<T> {
		return fetch<T>(
			url.href,
			{
				method: FetchMethods.Get,
				headers: {
					'Content-Type': 'application/json',
					[HOLODEX_HEADER]: apiKey
				}
			},
			FetchResultTypes.JSON
		);
	}
}
