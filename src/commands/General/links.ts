import { AmanekoCommand } from '../../lib/extensions/AmanekoCommand.js';
import { BrandColors } from '../../lib/utils/constants.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Info and links about Amaneko.'
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('links')
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		const icon = interaction.client.user.avatarURL({
			forceStatic: true,
			size: 512,
			extension: 'png'
		})!;

		return await interaction.reply({
			embeds: [
				new EmbedBuilder() //
					.setColor(BrandColors.Default)
					.setAuthor({ name: 'Amaneko Links', iconURL: icon })
					.setDescription('Useful links that will help you learn about Amaneko.')
					.setFields(
						{ name: 'Documentation', value: 'https://docs.amaneko.ca/' },
						{ name: 'Source code', value: 'https://github.com/killbasa/Amaneko' },
						{ name: 'Donations', value: 'https://ko-fi.com/killbasa' }
					)
			],
			ephemeral: true
		});
	}
}
