import type { ClientConfig } from '#lib/types/Config';
import type { AmanekoEvents } from '#lib/utils/Events';
import type { RedisClient } from '@killbasa/redis-utils';
import type { HolodexChannel, PrismaClient } from '@prisma/client';
import type { CommunityPostData } from '#lib/types/YouTube';
import type { MeiliClient } from '#lib/extensions/MeiliClient';
import type { HolodexClient } from '#lib/structures/HolodexClient';
import type { TLDexClient } from '#lib/structures/TLDexClient';
import type { Collection } from 'discord.js';
import type { TLDex } from './TLDex';
import type { Holodex } from './Holodex';
import type { MetricsClient } from '#lib/structures/MetricsClient';

declare module 'discord.js' {
	interface ClientEvents {
		[AmanekoEvents.CommunityPost]: [post: CommunityPostData];
		[AmanekoEvents.StreamStart]: [video: Holodex.VideoWithChannel];
		[AmanekoEvents.StreamEnd]: [video: Holodex.VideoWithChannel];
		[AmanekoEvents.StreamComment]: [channelId: string, message: TLDex.CommentPayload];
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
		holodex: HolodexClient;
		tldex: TLDexClient;
		prisma: PrismaClient;
		redis: RedisClient;
		meili: MeiliClient;
		metrics: MetricsClient;

		cache: {
			holodexChannels: Collection<string, HolodexChannel>;
		};
	}
}
