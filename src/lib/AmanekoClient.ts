import { SapphireClient } from '@sapphire/framework';
import { IntentsBitField } from 'discord.js';

export class AmananekoClient extends SapphireClient {
	public constructor() {
		super({
			intents: [
				IntentsBitField.Flags.MessageContent, //
				IntentsBitField.Flags.Guilds
			]
		});
	}

	public override async login(token: string): Promise<string> {
		return super.login(token);
	}

	public override async destroy(): Promise<void> {
		return super.destroy();
	}
}
