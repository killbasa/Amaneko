import { Collection } from 'discord.js';
import type { GuildSettings } from '#lib/types/Cache';

export class GuildSettingsCollection extends Collection<string, GuildSettings> {
	public update(guildId: string, data: GuildSettings): GuildSettings {
		const guild = this.getGuild(guildId);

		const merge = { ...guild, ...data };
		this.set(guildId, merge);

		return merge;
	}

	public blacklistAdd(guildId: string, channelId: string): void {
		const guild = this.getGuild(guildId);
		if (guild.blacklist.has(channelId)) return;
		guild.blacklist.add(channelId);
	}

	public blacklistRemove(guildId: string, channelId: string): boolean {
		const guild = this.getGuild(guildId);
		return guild.blacklist.delete(channelId);
	}

	private getGuild(guildId: string): GuildSettings {
		const guild = this.get(guildId);
		if (!guild) {
			throw new Error(`Guild not found. (${guildId})`);
		}
		return guild;
	}
}
