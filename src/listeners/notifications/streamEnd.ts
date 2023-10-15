import { AmanekoEvents } from '#lib/utils/enums';
import { YoutubeEmbedsKey } from '#lib/utils/cache';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '#lib/types/Holodex';

@ApplyOptions<Listener.Options>({
	name: 'StreamEndCleanup',
	event: AmanekoEvents.StreamEnd
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamEnd> {
	public async run(video: Holodex.VideoWithChannel): Promise<void> {
		const { tracer, container } = this;
		const { redis, client } = container;

		await tracer.createSpan('stream_end', async () => {
			const embeds = await tracer.createSpan('fetch_messages', async () => {
				return redis.hGetAll<string>(YoutubeEmbedsKey(video.id));
			});
			if (embeds.size === 0) return;

			return Promise.allSettled(
				Array.from(embeds).map(async ([messageId, channelId]) => {
					return tracer.createSpan(`process_message:${messageId}`, async () => {
						const discordChannel = await client.channels.fetch(channelId);
						if (!discordChannel?.isTextBased()) return;

						const embedMessage = await discordChannel.messages.fetch(messageId).catch(() => null);
						if (!embedMessage) return;

						return embedMessage.delete().catch(() => null);
					});
				})
			);
		});
	}
}
