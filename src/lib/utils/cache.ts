export const YoutubeNotificationKey = (streamId: string): string => `youtube:streams:${streamId}:notified`;

export const YoutubeEmbedsKey = (streamId: string): string => `youtube:streams:${streamId}:embeds`;

export const YoutubeScheduleKey = (guildId: string): string => `discord:guild:${guildId}:videos`;
