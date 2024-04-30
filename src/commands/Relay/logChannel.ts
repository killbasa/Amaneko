import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { NotifChannelTypes } from '../../lib/utils/constants.js';
import { canSendGuildAttachments } from '../../lib/utils/permissions.js';
import { defaultReply, errorReply, successReply } from '../../lib/utils/reply.js';
import { PermissionFlagsBits, channelMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Have relay logs sent to a specific channel.',
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
								.addChannelTypes(...NotifChannelTypes)
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
		const channel = interaction.options.getChannel('discord_channel', true, NotifChannelTypes);
		const channelId = channel.id;

		if (!canSendGuildAttachments(channel)) {
			return await errorReply(interaction, `I am not able to send files in ${channelMention(channelId)}`);
		}

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: { relayHistoryChannelId: channel.id },
			create: { id: interaction.guildId, relayHistoryChannelId: channel.id }
		});

		return await successReply(interaction, `Relay logs will now be sent to ${channelMention(channel.id)}`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const oldSettings = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { relayHistoryChannelId: true }
		});
		if (!oldSettings?.relayHistoryChannelId) {
			return await defaultReply(interaction, 'Relay logs are not being sent to a specific channel.');
		}

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: { relayHistoryChannelId: null },
			create: { id: interaction.guildId, relayHistoryChannelId: null }
		});

		return await successReply(interaction, `Relay logs will no longer be sent to ${channelMention(oldSettings.relayHistoryChannelId)}`);
	}

	public async handleShow(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const result = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { relayHistoryChannelId: true }
		});
		if (!result?.relayHistoryChannelId) {
			return await defaultReply(interaction, 'Relay logs are not being sent to a specific channel.');
		}

		return await defaultReply(interaction, `Relays logs are being sent to ${channelMention(result.relayHistoryChannelId)}`);
	}
}
