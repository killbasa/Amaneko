import type { Holodex } from '#lib/types/Holodex';
import type { TLDex } from '#lib/types/TLDex';
import type { Prisma } from '@prisma/client';

export function resolveRelayQuery(comment: TLDex.CommentPayload, video: Holodex.VideoWithChannel): Prisma.SubscriptionWhereInput {
	const { is_vtuber: isVTuber, is_tl: isTL, is_moderator: isMod, channel_id: cmtChannelId } = comment;

	const query: Prisma.SubscriptionWhereInput = {
		channelId: video.channel.id,
		relayChannelId: { not: null }
	};

	if (isVTuber) {
		query.guild = {
			blacklist: { none: { channelId: cmtChannelId } }
		};
	} else {
		query.guild = {
			blacklist: { none: { channelId: cmtChannelId } },
			relayTranslations: isTL ? true : undefined,
			relayMods: isMod ? true : undefined
		};
	}

	return query;
}
