import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { AmanekoError } from '../../lib/structures/AmanekoError.js';
import { BrandColors } from '../../lib/utils/constants.js';
import { successReply } from '../../lib/utils/reply.js';
import { getUsername } from '../../lib/utils/youtube.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { Blacklist } from '@prisma/client';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Manage the stream chat relay blacklist.',
	runIn: ['GUILD_ANY'],
	subcommands: [
		{ name: 'add', chatInputRun: 'handleAdd' },
		{ name: 'remove', chatInputRun: 'handleRemove' },
		{ name: 'clear', chatInputRun: 'handleClear' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('blacklist')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Add a channel to the blacklist.')
						.addStringOption((option) =>
							option //
								.setName('id')
								.setDescription("The youtube channel's ID")
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('remove')
						.setDescription('Remove a channel from the blacklist.')
						.addStringOption((option) =>
							option //
								.setName('id')
								.setDescription("The youtube channel's ID")
								.setRequired(true)
								.setAutocomplete(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('clear')
						.setDescription('Clear the blacklist.')
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('list')
						.setDescription('Show channel blacklist.')
				)
		);
	}

	public override async autocompleteRun(interaction: AmanekoSubcommand.AutocompleteInteraction): Promise<void> {
		const guildData = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { blacklist: true }
		});
		const focusedValue = interaction.options.getFocused();

		if (!guildData) {
			await interaction.respond([]);
			return;
		}

		const filteredOptions = guildData.blacklist.filter((entry) => {
			return entry.channelName.startsWith(focusedValue);
		});
		const options: ApplicationCommandOptionChoiceData[] = filteredOptions.map((option) => ({
			name: option.channelName === 'Username not found' ? option.channelId : option.channelName,
			value: option.channelId
		}));

		await interaction.respond(options);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const idToBlacklist = interaction.options.getString('id', true);
		const channelName = await getUsername(idToBlacklist);

		const guildData = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { blacklist: true }
		});

		if (guildData?.blacklist.some((entry) => entry.channelId === idToBlacklist)) {
			throw new AmanekoError('Channel is already blacklisted.');
		}

		const data = await this.container.prisma.blacklist.create({
			data: {
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				},
				channelId: idToBlacklist,
				channelName
			},
			select: { channelName: true, channelId: true }
		});

		return await successReply(interaction, `Added **${channelName === 'Username not found' ? data.channelId : data.channelName}** to the blacklist.`);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const idToUnblacklist = interaction.options.getString('id', true);

		const { channelName } = await this.container.prisma.$transaction(async (prisma) => {
			const result = await prisma.guild.findUnique({
				where: { id: interaction.guildId },
				select: { blacklist: true }
			});

			if (!result?.blacklist) {
				throw new AmanekoError('There are no blacklisted channels.');
			}

			if (!result.blacklist.some((entry) => entry.channelId === idToUnblacklist)) {
				throw new AmanekoError('This channel is not blacklisted');
			}

			return await prisma.blacklist.delete({
				where: { channelId_guildId: { channelId: idToUnblacklist, guildId: interaction.guildId } },
				select: { channelName: true }
			});
		});

		return await successReply(interaction, `Removed **${channelName === 'Username not found' ? idToUnblacklist : channelName}** from the blacklist.`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		await this.container.prisma.blacklist.deleteMany({
			where: { guildId: interaction.guildId }
		});

		return await successReply(interaction, 'All users have been removed from the blacklist.');
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const guildData = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { blacklist: true }
		});
		const blacklist = guildData?.blacklist;

		if (!blacklist || blacklist.length === 0) {
			const embed = this.blacklistEmbed([]);
			return await interaction.editReply({ embeds: [embed] });
		}

		const menu = new PaginatedMessage();
		const chunkSize = 15;

		for (let i = 0; i < blacklist.length; i += chunkSize) {
			menu.addPageEmbed(this.blacklistEmbed(blacklist.slice(i, i + chunkSize)));
		}

		return await menu.run(interaction);
	}

	private blacklistEmbed(blacklist: Blacklist[] = []): EmbedBuilder {
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Youtube Blacklist');

		if (blacklist.length > 0) {
			const channelIds = blacklist.map((entry) => entry.channelId).join('\n');
			const channelNames = blacklist.map((entry) => entry.channelName).join('\n');
			const separators = new Array(blacklist.length).fill('\u200b').join('\n');

			embed
				.addFields({
					name: 'Channel Id',
					value: channelIds,
					inline: true
				})
				.addFields({
					name: '|',
					value: separators,
					inline: true
				})
				.addFields({
					name: 'Channel Name',
					value: channelNames || '\u200b',
					inline: true
				});
		} else {
			embed.setDescription('No blacklisted channels.');
		}

		return embed;
	}
}
