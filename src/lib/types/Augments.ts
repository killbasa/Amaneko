import type { ClientConfig } from '#lib/types/Config';
import type { AmanekoEvents } from '#lib/utils/enums';
import type { Primitive, RedisClient } from '@killbasa/redis-utils';
import type { HolodexChannel, PrismaClient } from '@prisma/client';
import type { CommunityPostData } from '#lib/types/YouTube';
import type { MeiliClient } from '#lib/extensions/MeiliClient';
import type { HolodexClient } from '#lib/structures/HolodexClient';
import type { TLDexClient } from '#lib/structures/TLDexClient';
import type { Collection } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';
import type { Holodex } from '#lib/types/Holodex';
import type { MetricsClient } from '#lib/structures/MetricsClient';
import type { youtube_v3 } from 'googleapis';
import type { OpenTelemetryClient } from '#lib/structures/OpenTelemetryClient';
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
}

declare module '@sapphire/plugin-logger' {
	interface LoggerOptions {
		json?: boolean;
		labels?: Record<string, Primitive>;
	}
}
