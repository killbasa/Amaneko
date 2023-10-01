export const YoutubeNotifKey = (streamId: string): string => `youtube:streams:${streamId}:notified`;

export const YoutubePrechatNotifKey = (streamId: string): string => `youtube:streams:${streamId}:prechat:notified`;

export const YoutubeEmbedsKey = (streamId: string): string => `youtube:streams:${streamId}:embeds`;

export const YoutubeScheduleKey = (guildId: string): string => `discord:guild:${guildId}:videos`;
