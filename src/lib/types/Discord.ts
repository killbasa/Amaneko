export type BaseGuild = {
	id: string;
	scheduleChannelId: string | null;
	scheduleMessageId: string | null;
	adminRoles: string[];
};

export type GuildWithSubscriptions = {
	id: string;
	scheduleChannelId: string | null;
	scheduleMessageId: string | null;
	subscriptions: {
		id: string;
		roleId: string | null;
		discordChannelId: string | null;
		memberRoleId: string | null;
		memberDiscordChannelId: string | null;
		relayChannelId: string | null;
		communityPostRoleId: string | null;
		communityPostChannelId: string | null;
		channelId: string | null;
		guildId: string;
	}[];
};
