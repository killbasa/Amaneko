import type { Socket } from 'socket.io-client';

export namespace TLDex {
	export type VideoUpdatePayload = {
		type: 'update';
		status: 'live' | 'missing' | 'new' | 'past' | 'upcoming';
		start_actual: string | null;
		live_viewers: number | null;
	};

	export type CommentPayload = {
		type?: string;
		channel_id?: string;
		name: string;
		message: string;
		timestamp: number;
		video_offset: number;
		is_tl?: boolean;
		is_vtuber?: boolean;
		is_moderator?: boolean;
		is_verified?: boolean;
	};

	export type Payload = CommentPayload | VideoUpdatePayload;

	export type VideoId = `${string}/en`;

	type SubscribeErrorPayload = {
		id: string;
		message: string;
	};

	type SubscribeSuccessPayload = {
		id: string;
		live_viewers?: number;
		status?: 'live';
		start_actual?: string;
		handled_chats?: number;
	};

	type SubscribePayload = {
		video_id: string;
		lang: string;
	};

	type UnsubscribePayload = {
		id: string;
	};

	export type ServerToClientEvents = {
		subscribeError: (payload: SubscribeErrorPayload) => void;
		subscribeSuccess: (payload: SubscribeSuccessPayload) => void;
		unsubscribeSuccess: (payload: UnsubscribePayload) => void;
		[key: VideoId]: (payload: Payload) => void;
	};

	export type ClientToServerEvents = {
		subscribe: (payload: SubscribePayload) => void;
		unsubscribe: (payload: SubscribePayload) => void;
	};

	export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
}
