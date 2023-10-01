import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, codeBlock } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Get the current TLDex rooms',
	preconditions: ['BotOwnerOnly']
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('tldexrooms')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		const rooms = this.container.tldex.getRoomList();

		return interaction.reply({
			content: `Current TLDex rooms (${rooms.length}):\n${codeBlock('ts', rooms.join('\n'))}`
		});
	}
}
