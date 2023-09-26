import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Ping the bot to see if it is alive.'
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('ping')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(true)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		const message = await interaction.reply({ content: 'Ping?', fetchReply: true });

		const diff = message.createdTimestamp - interaction.createdTimestamp;
		const ping = Math.round(this.container.client.ws.ping);

		return interaction.editReply(`Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`);
	}
}
