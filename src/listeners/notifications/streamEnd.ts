import { AmanekoEvents } from '#lib/utils/Events';
import { YoutubeEmbedsKey } from '#lib/utils/cache';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'StreamEndNotification',
	event: AmanekoEvents.StreamEnd
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamEnd> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const embeds = await this.container.redis.hGetAll<string>(YoutubeEmbedsKey(video.id));
		if (embeds.size === 0) return;

		await Promise.allSettled(
			Array.from(embeds).map(async ([messageId, channelId]) => {
				const discordChannel = await this.container.client.channels.fetch(channelId);
				if (!discordChannel?.isTextBased()) return;

				const embedMessage = await discordChannel.messages.fetch(messageId).catch(() => null);
				if (!embedMessage) return;

				return embedMessage.delete().catch(() => null);
			})
		);
	}
}
