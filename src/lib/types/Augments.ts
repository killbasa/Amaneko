import type { ClientConfig } from '#lib/types/Config';
import type { AmanekoEvents } from '#lib/utils/Events';
import type { RedisClient } from '@killbasa/redis-utils';
import type { PrismaClient } from '@prisma/client';
import type { CommunityPostData } from '#lib/types/YouTube';
import type { MeiliClient } from '#lib/extensions/MeiliClient';
import type { HolodexClient } from '#lib/extensions/HolodexClient';

declare module 'discord.js' {
	interface ClientEvents {
		[AmanekoEvents.CommunityPost]: [post: CommunityPostData];
	}
}
declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
		holodex: HolodexClient;
		prisma: PrismaClient;
		redis: RedisClient;
		meili: MeiliClient;
	}
}
