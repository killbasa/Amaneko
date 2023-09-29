import { container } from '@sapphire/pieces';
import { Guild } from 'discord.js';
import type { GuildSettings } from '#lib/types/cache';

Object.defineProperty(Guild.prototype, 'settings', {
	get(): GuildSettings | undefined {
		return container.client.settings.get(this.id);
	}
});
