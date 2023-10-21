import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { successReply } from '#lib/utils/discord';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, PermissionFlagsBits, channelMention } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Have relay logs sent to a specific channel.',
	runIn: ['GUILD_ANY'],
	subcommands: [
		{ name: 'set', chatInputRun: 'handleSet' },
		{ name: 'clear', chatInputRun: 'handleClear' },
		{ name: 'show', chatInputRun: 'handleShow' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('logchannel')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('set')
						.setDescription('Set a channel to send the relay logs to.')
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('The channel to send relay logs to.')
								.setRequired(true)
								.addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('clear')
						.setDescription('Clear the current relay log channel.')
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('show')
						.setDescription('Show the current relay log channel.')
				)
		);
	}

	public async handleSet(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channel = interaction.options.getChannel('discord_channel', true, [ChannelType.GuildAnnouncement, ChannelType.GuildText]);

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: { relayHistoryChannelId: channel.id },
			create: { id: interaction.guildId, relayHistoryChannelId: channel.id }
		});

		return successReply(interaction, `Relay logs will now be sent to ${channelMention(channel.id)}`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: { relayHistoryChannelId: null },
			create: { id: interaction.guildId, relayHistoryChannelId: null }
		});

		return successReply(interaction, 'Relay logs will no longer be sent to a specific channel.');
	}

	public async handleShow(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const result = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { relayHistoryChannelId: true }
		});
		if (!result?.relayHistoryChannelId) {
			return successReply(interaction, 'Relay logs are not being sent to a specific channel.');
		}

		return successReply(interaction, `Relays logs are being sent to: ${channelMention(result.relayHistoryChannelId)}`);
	}
}
