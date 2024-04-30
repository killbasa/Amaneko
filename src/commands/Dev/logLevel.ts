import { AmanekoCommand } from '../../lib/extensions/AmanekoCommand.js';
import { ApplyOptions } from '@sapphire/decorators';
import { LogLevel } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: "Set the bot's log level",
	preconditions: ['BotOwnerOnly']
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('dev_loglevel')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addStringOption((option) =>
						option //
							.setName('level')
							.setDescription('The log level to set')
							.setRequired(true)
							.addChoices(
								{ name: 'debug', value: LogLevel.Debug.toString() }, //
								{ name: 'info', value: LogLevel.Info.toString() }
							)
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		const level = interaction.options.getString('level', true);
		this.container.logger.setLevel(Number(level));

		return await interaction.reply(`Log level set to ${level} (20 = debug, 30 = info)`);
	}
}
