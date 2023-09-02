import type { ClientConfig } from '#lib/types/Config';
import type { AmanekoEvents } from '#lib/utils/Events';
import type { RedisClient } from '@killbasa/redis-utils';
import type { PrismaClient } from '@prisma/client';
import type { CommunityPostData } from '#lib/types/YouTube';

declare module 'discord.js' {
	interface ClientEvents {
		[AmanekoEvents.CommunityPost]: [post: CommunityPostData];
	}
}
declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
		prisma: PrismaClient;
		redis: RedisClient;
	}
}
