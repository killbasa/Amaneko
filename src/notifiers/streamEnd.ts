import { AmanekoNotifier } from '../lib/extensions/AmanekoNotifier.js';
import { YoutubeEmbedsKey } from '../lib/utils/cache.js';
import { AmanekoEvents } from '../lib/utils/enums.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { Holodex } from '../lib/types/Holodex.js';

@ApplyOptions<AmanekoNotifier.Options>({
	name: 'StreamEndCleanup',
	event: AmanekoEvents.StreamEnd
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.StreamEnd> {
	public async process(video: Holodex.VideoWithChannel) {
		const { tracer, container } = this;
		const { redis } = container;

		const embeds = await tracer.createSpan('fetch_messages', async () => {
			return await redis.hGetAll<string>(YoutubeEmbedsKey(video.id));
		});
		if (embeds.size === 0) return this.none();

		return this.some({ embeds, videoId: video.id });
	}

	public async send({ embeds, videoId }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { redis, client } = container;

		await Promise.allSettled(
			Array.from(embeds).map(async ([messageId, channelId]) => {
				return await tracer.createSpan(`process_message:${messageId}`, async () => {
					const discordChannel = await client.channels.fetch(channelId);
					if (!discordChannel?.isTextBased()) return;

					const embedMessage = await discordChannel.messages.fetch(messageId).catch(() => null);
					if (!embedMessage) return;

					return await embedMessage.delete().catch(() => null);
				});
			})
		);

		await redis.delete(YoutubeEmbedsKey(videoId));
	}
}
