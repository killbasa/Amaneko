import { Guild } from 'discord.js';

Object.defineProperty(Guild.prototype, 'settings', {
	get(): void {
		// return container.client.settings.get(this.id);
	}
});
