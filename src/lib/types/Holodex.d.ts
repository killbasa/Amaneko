export namespace Holodex {
	export type Channel = {
		id: string;
		name: string;
		english_name: string | null;
		description: string;
		photo: string | null;
		thumbnail: string;
		banner: string | null;
		org: string | null;
		suborg: string | null;
		type: 'subber' | 'vtuber';
		twitter: string | null;
		inactive: boolean;
		twitch: string | null;
		group: string | null;
	};

	export type ChannelMin = {
		id: string;
		name: string;
		english_name: string | null;
		type: string;
		photo: string;
	};

	export type Video = {
		available_at: string;
		duration: number;
		id: string;
		published_at: string | null;
		start_actual: string | null;
		start_scheduled: string | null;
		status: 'live' | 'missing' | 'new' | 'past' | 'upcoming';
		title: string;
		topic_id: string | null;
		type: 'clip' | 'stream';
		description: string | null;
		live_viewers: number | null;
	};

	export type VideoWithChannel = Video & {
		channel: ChannelMin;
	};
}
