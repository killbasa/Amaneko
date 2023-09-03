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
