import type { DeepPartial } from '#src/lib/types/Generic';
import type { TLDex } from '#src/lib/types/TLDex';

export function getComment(data: {
	channeId?: string | false;
	message?: string;
	verified?: boolean;
	vtuber?: boolean;
	tl?: boolean;
	mod?: boolean;
}): DeepPartial<TLDex.CommentPayload> {
	const { channeId, message, verified = false, vtuber = false, tl = false, mod = false } = data;
	return {
		channel_id: channeId === false ? undefined : channeId ?? '1',
		message,
		is_verified: verified,
		is_vtuber: vtuber,
		is_tl: tl,
		is_moderator: mod
	};
}
