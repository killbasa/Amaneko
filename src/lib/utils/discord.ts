import { NotifChannelTypes } from '#lib/utils/constants';
import type { ChannelType } from 'discord.js';

export function isNotifChannel(channel: ChannelType): channel is (typeof NotifChannelTypes)[number] {
	return NotifChannelTypes.includes(
		// @ts-expect-error NotifChannelTypes "as const" and expects specific values
		channel
	);
}
