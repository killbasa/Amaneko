import type { ClientConfig } from '#lib/types/Config';
import type { RedisClient } from '@killbasa/redis-utils';
import type { PrismaClient } from '@prisma/client';

declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
		prisma: PrismaClient;
		redis: RedisClient;
	}
}
