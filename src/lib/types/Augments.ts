import type { ClientConfig } from '#lib/types/Config';
import type { Primitive, RedisClient } from '@killbasa/redis-utils';
import type { HolodexChannel, PrismaClient } from '@prisma/client';
import type { MeiliClient } from '#lib/extensions/MeiliClient';
import type { HolodexClient } from '#lib/structures/HolodexClient';
import type { TLDexClient } from '#lib/structures/TLDexClient';
import type { Collection } from 'discord.js';
import type { MetricsClient } from '#lib/structures/MetricsClient';
import type { youtube_v3 } from 'googleapis';
import type { OpenTelemetryClient } from '#lib/structures/OpenTelemetryClient';
import type { LogLevel } from '@sapphire/framework';
import type { NotifierStore } from '#lib/extensions/NotifierStore';

declare module 'discord.js' {
	interface Client {}
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

	interface StoreRegistryEntries {
		notifiers: NotifierStore;
	}
}

declare module '@sapphire/plugin-logger' {
	interface LoggerOptions {
		json?: boolean;
		labels?: Record<string, Primitive>;
	}
}
