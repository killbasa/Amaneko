import type { Guild, Subscription } from '@prisma/client';

export type BaseGuild = {
	id: Guild['id'];
	scheduleChannelId: Guild['scheduleChannelId'];
	scheduleMessageId: Guild['scheduleMessageId'];
};

export type GuildWithSubscriptions = BaseGuild & {
	subscriptions: Subscription[];
};
