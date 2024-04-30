import { HOLODEX_BASE_URL, HOLODEX_HEADER } from '../utils/constants.js';
import { FetchMethods, FetchResultTypes, fetch } from '@sapphire/fetch';
import type { Holodex } from '../types/Holodex.js';

export class HolodexClient {
	private readonly apiKey;

	public constructor(options: { apiKey: string }) {
		this.apiKey = options.apiKey;
	}

	public async getChannels(query: { limit?: number; offset?: number } = {}): Promise<Holodex.Channel[]> {
		const { limit = 100, offset = 0 } = query;

		const url = new URL(`${HOLODEX_BASE_URL}/channels`);
		url.searchParams.append('type', 'vtuber');
		url.searchParams.append('limit', limit.toString());
		url.searchParams.append('offset', offset.toString());

		return await this.fetch<Holodex.Channel[]>(url, this.apiKey);
	}

	public async getLiveVideos(query: { channels?: Set<string>; maxUpcoming?: number }): Promise<Holodex.VideoWithChannel[]> {
		const { channels, maxUpcoming } = query;

		const url = new URL(`${HOLODEX_BASE_URL}/users/live`);
		if (channels) url.searchParams.append('channels', Array.from(channels).toString());

		const result = await this.fetch<Holodex.VideoWithChannel[]>(url, this.apiKey);
		if (maxUpcoming) {
			return result.filter(({ channel, available_at }) => {
				if (channels) {
					return new Date(available_at).getTime() <= Date.now() + maxUpcoming && channels.has(channel.id);
				}
				return new Date(available_at).getTime() <= Date.now() + maxUpcoming;
			});
		}

		return result;
	}

	public async getVideos(query: { maxUpcoming?: number }): Promise<Holodex.VideoWithChannel[]> {
		const { maxUpcoming } = query;

		const url = new URL(`${HOLODEX_BASE_URL}/live`);
		url.searchParams.append('status', 'upcoming,live');
		url.searchParams.append('type', 'stream');
		url.searchParams.append('limit', '9999');
		url.searchParams.append('max_upcoming_hours', '1');

		const result = await this.fetch<Holodex.VideoWithChannel[]>(url, this.apiKey);
		if (maxUpcoming) {
			return result.filter(({ available_at }) => {
				return new Date(available_at).getTime() <= Date.now() + maxUpcoming;
			});
		}

		return result;
	}

	private async fetch<T = unknown>(url: URL, apiKey: string): Promise<T> {
		return await fetch<T>(
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
