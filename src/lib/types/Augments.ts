import type { ClientConfig } from './Config.js';
import type { AmanekoEvents } from '../utils/enums.js';
import type { Primitive, RedisClient } from '@killbasa/redis-utils';
import type { HolodexChannel, PrismaClient } from '@prisma/client';
import type { CommunityPostData } from './YouTube.js';
import type { MeiliClient } from '../extensions/MeiliClient.js';
import type { HolodexClient } from '../structures/HolodexClient.js';
import type { TLDexClient } from '../structures/TLDexClient.js';
import type { Collection } from 'discord.js';
import type { TLDex } from './TLDex.js';
import type { Holodex } from './Holodex.js';
import type { MetricsClient } from '../structures/MetricsClient.js';
import type { youtube_v3 } from 'googleapis';
import type { OpenTelemetryClient } from '../structures/OpenTelemetryClient.js';
import type { LogLevel } from '@sapphire/framework';

declare module 'discord.js' {
	interface Client {}

	interface ClientEvents {
		[AmanekoEvents.CommunityPost]: [post: CommunityPostData];
		[AmanekoEvents.StreamPrechat]: [video: Holodex.VideoWithChannel];
		[AmanekoEvents.StreamStart]: [video: Holodex.VideoWithChannel];
		[AmanekoEvents.StreamEnd]: [video: Holodex.VideoWithChannel];
		[AmanekoEvents.StreamComment]: [message: TLDex.CommentPayload, video: Holodex.VideoWithChannel];
	}
}

declare module '@sapphire/framework' {
	interface ILogger {
		setLevel(level: LogLevel): void;
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
		youtube: youtube_v3.Youtube;
		holodex: HolodexClient;
		tldex: TLDexClient;
		prisma: PrismaClient;
		redis: RedisClient;
		meili: MeiliClient;
		metrics: MetricsClient;
		otel: OpenTelemetryClient;

		cache: {
			holodexChannels: Collection<string, HolodexChannel>;
		};
	}

	interface StoreRegistryEntries {}
}

declare module '@sapphire/plugin-logger' {
	interface LoggerOptions {
		json?: boolean;
		labels?: Record<string, Primitive>;
	}
}
