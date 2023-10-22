import { canSendAttachments, canSendEmbeds, canSendMessages, isDMChannel, isGuildBasedChannel } from '@sapphire/discord.js-utilities';
import type { GuildTextBasedChannel, PermissionResolvable } from 'discord.js';
import type { ChannelTypes } from '@sapphire/discord.js-utilities';

export function canSendGuildMessages(channel: ChannelTypes | null): channel is GuildTextBasedChannel {
	if (isDMChannel(channel)) return false;
	return canSendMessages(channel);
}

export function canSendGuildEmbeds(channel: ChannelTypes | null): channel is GuildTextBasedChannel {
	if (isDMChannel(channel)) return false;
	return canSendEmbeds(channel);
}

export function canSendGuildAttachments(channel: ChannelTypes | null): channel is GuildTextBasedChannel {
	if (isDMChannel(channel)) return false;
	return canSendAttachments(channel);
}

export function hasPermissions(channel: ChannelTypes | null, permissions: PermissionResolvable): boolean {
	if (!isGuildBasedChannel(channel)) return true;

	const { me } = channel.guild.members;
	if (!me) return false;

	const permissionsFor = channel.permissionsFor(me);
	return permissionsFor.has(permissions);
}
