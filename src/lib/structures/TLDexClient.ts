import { AmanekoEvents } from '#lib/utils/enums';
import { HOLODEX_WEBSOCKET_URL } from '#lib/utils/constants';
import { container } from '@sapphire/pieces';
import { io } from 'socket.io-client';
import { Time } from '@sapphire/duration';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';

export class TLDexClient {
	private readonly socket: TLDex.TypedSocket;

	private readonly videos = new Map<string, Holodex.VideoWithChannel>();
	private readonly queue = new Map<string, () => void>();
	private readonly retries = new Map<string, number>();
	private flushed = true;

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
			container.logger.info('[TLDex] Connected.');

			// For disconnects, retry until the queue is full again
			const interval = setInterval(() => {
				if (this.flushed) {
					for (const subscribe of this.queue.values()) {
						subscribe();
					}

					clearInterval(interval);
				}
			}, Time.Second);
		});

		this.socket.on('connect_error', (err) => {
			container.logger.error('[TLDex] Connection error.', err);
		});

		this.socket.on('disconnect', (reason) => {
			container.logger.error('[TLDex] Disconnected.', reason);
			// Add a lock until all of the videos are queued
			this.flushed = false;

			for (const [videoId, video] of this.videos) {
				this.queue.set(videoId, this.createSubCallback(video, true));
			}

			this.videos.clear();
			this.retries.clear();

			this.flushed = true;
		});

		this.socket.on('subscribeSuccess', (payload) => {
			if (payload.id === undefined) {
				container.logger.error(`[TLDex] Received undefined for ID: ${payload.id} (${JSON.stringify(payload)})`);
			} else {
				container.logger.debug(`[TLDex] Joined room: ${payload.id}`);

				this.queue.delete(payload.id);
				this.retries.delete(payload.id);
			}
		});

		this.socket.on('subscribeError', (payload) => {
			container.logger.debug('[TLDex] Subscription error.', payload);

			const count = (this.retries.get(payload.id) ?? 0) + 1;
			this.retries.set(payload.id, count);

			if (count < 5) {
				const subscribe = this.queue.get(payload.id);

				if (subscribe) {
					setTimeout(() => {
						subscribe();
					}, Time.Second * 30);
				} else {
					this.retries.delete(payload.id);
				}
			} else {
				container.logger.error(`[TLDex] Hit max retry on subscription attempts. (${payload.id})`);

				this.retries.delete(payload.id);
				this.queue.delete(payload.id);
				this.socket.removeAllListeners(`${payload.id}/en`);
			}
		});

		this.socket.on('unsubscribeSuccess', (payload) => {
			container.logger.debug(`[TLDex] Left room: ${payload.id}`);
		});
	}

	public get size(): number {
		return this.videos.size;
	}

	public connect(): void {
		if (this.socket.connected) return;
		this.socket.connect();
	}

	public destroy(): void {
		this.socket.removeListener('disconnect');
		if (this.socket.connected) {
			this.socket.disconnect();
		}

		this.unsubscribeAll();
	}

	public getRoomList(): string[] {
		return Array.from(this.videos).map(([videoId]) => videoId);
	}

	public hasRoom(videoId: string): boolean {
		return this.videos.has(videoId);
	}

	public async subscribe(video: Holodex.VideoWithChannel): Promise<void> {
		if (this.videos.has(video.id)) {
			this.videos.set(video.id, video);
			return;
		}

		const callback = this.createSubCallback(video);

		if (this.socket.connected) {
			callback();
		} else {
			this.queue.set(video.id, callback);
		}
	}

	public unsubscribe(videoId: string): void {
		this.queue.delete(videoId);
		if (!this.videos.has(videoId)) return;

		if (this.socket.connected) {
			this.socket.emit('unsubscribe', { video_id: videoId, lang: 'en' });
		}

		this.socket.removeAllListeners(`${videoId}/en`);
		this.videos.delete(videoId);
		this.retries.delete(videoId);
	}

	public unsubscribeAll(): void {
		for (const [videoId] of this.videos) {
			this.unsubscribe(videoId);
		}
	}

	private createSubCallback(video: Holodex.VideoWithChannel, resubscribe = false): () => void {
		if (resubscribe) {
			return (): void => {
				this.videos.set(video.id, video);
				this.socket.emit('subscribe', { video_id: video.id, lang: 'en' });
			};
		}

		return (): void => {
			this.videos.set(video.id, video);

			this.socket.removeAllListeners(`${video.id}/en`);
			this.socket.emit('subscribe', { video_id: video.id, lang: 'en' });

			this.socket.on(`${video.id}/en`, (message) => {
				if (this.filter(message)) return;
				const data = this.videos.get(video.id);
				if (!data) {
					throw new Error(`Expected video, received undefined (${video.id})`);
				}

				container.client.emit(AmanekoEvents.StreamComment, message, data);
			});
		};
	}

	private filter(message: TLDex.Payload): message is TLDex.VideoUpdatePayload {
		return message.type === 'update';
	}
}
