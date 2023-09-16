import type { HolodexChannel } from '@prisma/client';

export type CommunityPostData = {
	id: string;
	channelId: string;
	channelName: string;
	avatar: string;
	url: string;
	content: string;
	isToday: boolean;
};

export type Blacklist = {
	id: string;
	channelId: string;
	channelName: string;
	guildId: string;
};

export type LivestreamSubscription = {
	channel: HolodexChannel;
	roleId: string | null;
	discordChannelId: string | null;
	memberRoleId: string | null;
	memberDiscordChannelId: string | null;
};
