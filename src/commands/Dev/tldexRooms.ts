import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { AmanekoEmojis } from '#lib/utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, codeBlock } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Get the current TLDex rooms',
	preconditions: ['BotOwnerOnly'],
	subcommands: [
		{ name: 'has', chatInputRun: 'handleHas' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('tldexrooms')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('has')
							.setDescription('Check if the bot is currently subscribed to a TLDex room.')
							.addStringOption((option) =>
								option //
									.setName('room_id')
									.setDescription('The room ID to check.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('list')
							.setDescription('Get the list of currently subscribed TLDex rooms.')
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public async handleHas(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const roomID = interaction.options.getString('room_id', true);
		const result = this.container.tldex.hasRoom(roomID);

		return interaction.reply({
			content: `Subscribed to \`${roomID}\`: ${result ? AmanekoEmojis.GreenCheck : AmanekoEmojis.RedX}`
		});
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const rooms = this.container.tldex.getRoomList();

		return interaction.reply({
			content: `Current TLDex rooms (${rooms.length}):\n${codeBlock('ts', rooms.join('\n'))}`
		});
	}
}
