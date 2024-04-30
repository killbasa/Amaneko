import { container } from '@sapphire/framework';
import type { Holodex } from '../types/Holodex.js';
import type { TLDex } from '../types/TLDex.js';
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

export function shouldFilterComment(cmt: TLDex.CommentPayload, video: Holodex.VideoWithChannel): boolean {
	const { logger } = container;

	// Filter out verified-only channels
	// TODO: Allow certain verified channels?
	if (cmt.is_verified && !cmt.is_vtuber && !cmt.is_tl && !cmt.is_moderator) {
		if (process.env.NODE_ENV !== 'test') {
			logger.debug(`[Relay] Filtered out verified comment from ${cmt.name} (${video.channel.id})`, {
				isVTuber: cmt.is_vtuber,
				isTL: cmt.is_tl,
				isMod: cmt.is_moderator
			});
		}

		return true;
	}

	// Filter out Super Chat heart messages
	if (cmt.channel_id === video.channel.id) {
		if (cmt.message.startsWith('hearted a Super Chat from')) {
			if (process.env.NODE_ENV !== 'test') {
				logger.debug(`[Relay] Filtered out Super Chat heart message from ${cmt.name} (${video.channel.id})`);
			}

			return true;
		}
	}

	return false;
}

export function shouldFilterCameo(cmt: TLDex.CommentPayload, video: Holodex.VideoWithChannel): boolean {
	const { logger } = container;

	if (!cmt.channel_id || !cmt.is_vtuber || cmt.channel_id === video.channel.id) {
		if (process.env.NODE_ENV !== 'test') {
			logger.debug(`[Cameo] Filtered out comment from ${cmt.name} (${video.channel.id})`, {
				channelId: cmt.channel_id,
				videoChannelId: video.channel.id,
				isVTuber: cmt.is_vtuber
			});
		}

		return true;
	}

	return false;
}
