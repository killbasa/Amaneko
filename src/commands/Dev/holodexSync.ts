import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { AmanekoTasks } from '#lib/utils/tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Sync the channels from Holodex',
	preconditions: ['BotOwnerOnly'],
	cooldownDelay: Time.Minute * 30,
	cooldownLimit: 1
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('holodexsync')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		await this.container.tasks.create(
			AmanekoTasks.HolodexSync, //
			{ page: 0 },
			{ repeated: false, delay: 0 }
		);
		return interaction.reply(`Holodex sync started.`);
	}
}
