import { AmanekoEvents } from '#lib/utils/Events';
import { HOLODEX_WEBSOCKET_URL } from '#lib/utils/constants';
import { container } from '@sapphire/pieces';
import { io } from 'socket.io-client';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';

export class TLDexClient {
	private readonly socket: TLDex.TypedSocket;

	private readonly roomIds = new Set<TLDex.VideoId>();

	public constructor() {
		this.socket = io(HOLODEX_WEBSOCKET_URL, {
			path: '/api/socket.io/',
			transports: ['websocket'],
			autoConnect: false,
			upgrade: true,
			secure: true,
			reconnectionAttempts: 10,
			reconnectionDelay: 5000,
			reconnectionDelayMax: 20000
		});

		this.socket.on('connect', () => {
			container.logger.info('[TLDex] Connected');
		});

		this.socket.on('connect_error', (err) => {
			container.logger.error('[TLDex] Connection error.', err);
		});

		this.socket.on('disconnect', (reason) => {
			container.logger.error('[TLDex] Connection error.', reason);
		});

		this.socket.on('subscribeSuccess', (payload) => {
			this.roomIds.add(`${payload.id}/en`);
			container.logger.debug(`[TLDex] Joined room: ${payload.id}`);
		});

		this.socket.on('subscribeError', (payload) => {
			container.logger.error('[TLDex] Subscription error.', payload);
		});

		this.socket.on('unsubscribeSuccess', (payload) => {
			this.roomIds.delete(`${payload.video_id}/en`);
			container.logger.debug(`[TLDex] Left room: ${payload.video_id}`);
		});
	}

	public connect(): void {
		if (this.socket.connected) return;
		this.socket.connect();
	}

	public destroy(): void {
		if (!this.socket.connected) return;

		for (const roomId of this.roomIds) {
			this.unsubscribe(roomId);
		}

		this.socket.disconnect();
	}

	public isSubscribed(videoId: string): boolean {
		return this.roomIds.has(`${videoId}/en`);
	}

	public async subscribe(video: Holodex.VideoWithChannel): Promise<void> {
		if (!this.socket.connected) return;
		if (this.isSubscribed(video.id)) return;

		this.socket.emit('subscribe', { video_id: video.id, lang: 'en' });
		this.socket.removeAllListeners(`${video.id}/en`);

		this.socket.on(`${video.id}/en`, (message) => {
			if (this.filter(message)) return;
			container.client.emit(AmanekoEvents.StreamComment, video.channel.id, message);
		});
	}

	public unsubscribe(videoId: string): void {
		if (!this.socket.connected) return;
		if (!this.isSubscribed(videoId)) return;

		this.socket.emit('unsubscribe', { video_id: videoId, lang: 'en' });
		this.socket.removeAllListeners(`${videoId}/en`);
	}

	public unsubscribeAll(): void {
		for (const videoId of this.roomIds) {
			this.unsubscribe(videoId);
		}
	}

	private filter(message: TLDex.Payload): message is TLDex.VideoUpdatePayload {
		return message.type === 'update';
	}
}
