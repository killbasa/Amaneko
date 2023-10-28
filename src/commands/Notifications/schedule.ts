import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { defaultReply, errorReply, successReply } from '#utils/reply';
import { canSendGuildEmbeds } from '#lib/utils/permissions';
import { NotifChannelTypes } from '#lib/utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import type { ApplicationCommandRegistry } from '@sapphire/framework';

@ApplyOptions<AmanekoSubcommand.Options>({
	name: 'schedule',
	description: 'Sets up and manages a schedule for upcoming streams from currently subscribed channels.',
	subcommands: [
		{ name: 'set', chatInputRun: 'handleSet' },
		{ name: 'settings', chatInputRun: 'handleSettings' },
		{ name: 'unset', chatInputRun: 'handleUnset' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('schedule')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('set')
						.setDescription('Set up a schedule in the specified channel.')
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('The discord channel where the schedule will be posted.')
								.setRequired(true)
								.addChannelTypes(...NotifChannelTypes)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('settings')
						.setDescription("Change the schedule's settings.")
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('New channel to post the schedule.')
								.setRequired(true)
								.addChannelTypes(...NotifChannelTypes)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('unset')
						.setDescription('Removes the schedule from the server.')
				)
		);
	}

	public async handleSet(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const discordChannel = interaction.options.getChannel('discord_channel', true, NotifChannelTypes);
		const channelId = discordChannel.id;

		if (!canSendGuildEmbeds(discordChannel)) {
			return errorReply(interaction, `I am not able to send embeds in ${channelMention(channelId)}`);
		}

		const embed = new EmbedBuilder() //
			.setTitle('Upcoming Streams')
			.setFooter({ text: `Powered by Holodex` })
			.setTimestamp();

		const message = await discordChannel.send({
			embeds: [embed]
		});

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: {
				scheduleChannelId: discordChannel.id,
				scheduleMessageId: message.id
			},
			create: {
				id: interaction.guildId,
				scheduleChannelId: discordChannel.id,
				scheduleMessageId: message.id
			}
		});

		return successReply(interaction, `A schedule has been successfully set up in ${channelMention(discordChannel.id)}.`);
	}

	public async handleSettings(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const discordChannel = interaction.options.getChannel('discord_channel', true, NotifChannelTypes);

		const channelId = discordChannel.id;
		if (!canSendGuildEmbeds(discordChannel)) {
			return errorReply(interaction, `I am not able to send embeds in ${channelMention(channelId)}`);
		}

		const embed = new EmbedBuilder() //
			.setTitle('Upcoming Streams')
			.setFooter({ text: 'Powered by Holodex' })
			.setTimestamp();

		const previousGuild = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { scheduleChannelId: true, scheduleMessageId: true }
		});

		if (!previousGuild?.scheduleMessageId || !previousGuild?.scheduleChannelId) {
			return errorReply(
				interaction,
				"Something went wrong while trying to change the schedule's channel. Please run `/schedule set` before attempting any changes."
			);
		} else if (previousGuild.scheduleChannelId === discordChannel.id) {
			return defaultReply(interaction, `Schedule is already set up in that channel.`);
		}

		try {
			const message = await discordChannel.send({
				embeds: [embed]
			});

			await this.container.prisma.guild.update({
				where: { id: interaction.guildId },
				data: {
					scheduleChannelId: discordChannel.id,
					scheduleMessageId: message.id
				}
			});
		} catch (err) {
			this.container.logger.warn(err, {
				command: this.name
			});
			return errorReply(interaction, `Something went wrong while changing the schedule's channel.`);
		}

		try {
			const channel = await this.container.client.channels.fetch(previousGuild.scheduleChannelId);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch({ message: previousGuild.scheduleMessageId, force: true });
				message.delete();
			}
		} catch (err) {
			this.container.logger.warn(err, {
				command: this.name
			});
			return defaultReply(interaction, `Could not delete the schedule's old message but the settings have been applied.`);
		}

		return successReply(interaction, `The schedule will now be sent in ${channelMention(discordChannel.id)}.`);
	}

	public async handleUnset(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const guildData = await this.container.prisma.guild.findUnique({
			where: {
				id: interaction.guildId,
				scheduleChannelId: { not: null },
				scheduleMessageId: { not: null }
			},
			select: { scheduleChannelId: true, scheduleMessageId: true }
		});
		if (!guildData) {
			return defaultReply(interaction, `This server does not have a schedule setup.`);
		}

		await this.container.prisma.guild.update({
			where: { id: interaction.guildId },
			data: {
				scheduleChannelId: null,
				scheduleMessageId: null
			}
		});

		try {
			const channel = await this.container.client.channels.fetch(guildData.scheduleChannelId!);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch({ force: true, message: guildData.scheduleMessageId! });
				message.delete();
			}
		} catch (err) {
			// This will only give an error if it cannot fetch a message, which would only happen if either it's been
			// deleted, or we lost access to the channel. Either way it's not our problem, so we'll just ignore it
			this.container.logger.warn(err, {
				command: this.name
			});
			// On second thought I do want to give some explanation to the users as well
			return errorReply(interaction, "Could not delete the schedule's old message.");
		}

		return successReply(interaction, 'A schedule is no longer set up in this server.');
	}
}
