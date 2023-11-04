import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Invite Amaneko to your own server.'
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('invite')
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		return interaction.reply({
			content: 'Amaneko is currently in private testing. Public invites will be available soon!',
			ephemeral: true
		});
	}
}
