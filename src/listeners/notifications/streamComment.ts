import { AmanekoEvents } from '#lib/utils/Events';
import { permissionsCheck } from '#utils/discord';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { GuildTextBasedChannel } from 'discord.js';
import type { TLDex } from '#lib/types/TLDex';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.StreamComment,
	event: AmanekoEvents.StreamComment
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamComment> {
	public async run(channelId: string, comment: TLDex.CommentPayload): Promise<void> {
		const { prisma, client, metrics } = this.container;

		const ownerCheck = comment.is_owner
			? []
			: [
					{
						OR: [{ relayMods: { not: false } }, { relayTranslations: { not: false } }]
					},
					{
						OR: [{ relayMods: { equals: comment.is_moderator } }, { relayTranslations: { equals: comment.is_tl } }]
					}
			  ];

		const relayChannelIds = await prisma.subscription.findMany({
			where: {
				channelId,
				relayChannelId: { not: null },
				guild: {
					AND: ownerCheck,
					blacklist: { none: { channelId: comment.channel_id } }
				}
			},
			select: { relayChannelId: true }
		});

		if (relayChannelIds.length === 0) return;

		const fetchedChannels = await Promise.allSettled(
			relayChannelIds.map(async ({ relayChannelId }) => {
				return client.channels.fetch(relayChannelId!);
			})
		);

		const channels = fetchedChannels
			.map((entry) => {
				if (entry.status === 'rejected') return null;
				return entry.value;
			})
			.filter((entry): entry is GuildTextBasedChannel => entry !== null && entry.isTextBased());

		const content = this.formatMessage(channelId, comment);

		await Promise.allSettled([
			channels.map(async (channel) => {
				if (!(await permissionsCheck(channel.id))) {
					return;
				}
				return channel.send({ content });
			})
		]);

		metrics.incrementRelayComment();
	}

	private formatMessage(channelId: string, comment: TLDex.CommentPayload): string {
		if (comment.is_vtuber) {
			const channel = this.container.cache.holodexChannels.get(channelId);
			const org = channel?.org ?? '';

			return `[${org}] **${comment.name}:** \`${comment.message}\``;
		}

		if (comment.is_tl) {
			return `:speech_balloon:||${comment.name}:|| \`${comment.message}\``;
		}

		if (comment.is_moderator) {
			return `:tools:**${comment.name}:** \`${comment.message}\``;
		}

		return `${comment.name}: \`${comment.message}\``;
	}
}
