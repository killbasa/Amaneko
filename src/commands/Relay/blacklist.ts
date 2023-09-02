import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { AmanekoError } from '#lib/structures/AmanekoError';
import { BrandColors } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Add or remove a channel from the blacklist.',
	subcommands: [
		{ name: 'add', chatInputRun: 'handleAdd' },
		{ name: 'remove', chatInputRun: 'handleRemove' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName('blacklist')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand
							.setName('add')
							.setDescription('Add a channel to the blacklist.')
							.addStringOption((option) => option.setName('id').setDescription("The youtube channel's Id").setRequired(true))
					)
					.addSubcommand((subcommand) =>
						subcommand
							.setName('remove')
							.setDescription('Remove a channel from the blacklist.')
							.addStringOption((option) => option.setName('id').setDescription("The youtube channel's Id").setRequired(true).setAutocomplete(true))
					)
					.addSubcommand((subcommand) => subcommand.setName('list').setDescription('Show channel blacklist.')),
			{
				idHints: [],
				guildIds: []
			}
		);
	}

	public override async autocompleteRun(interaction: AmanekoSubcommand.AutocompleteInteraction): Promise<unknown> {
		const guildData = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { blacklistedChannels: true }
		});
		const focusedValue = interaction.options.getFocused();

		if (!guildData) {
			return interaction.respond([]);
		}

		const filteredOptions = guildData.blacklistedChannels.filter((channel) => channel.startsWith(focusedValue));
		const options: ApplicationCommandOptionChoiceData[] = filteredOptions.map((channel) => {
			return { name: channel, value: channel };
		});

		return interaction.respond(options);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const idToBlacklist = interaction.options.getString('id', true);

		await this.container.prisma.$transaction(async (prisma): Promise<void> => {
			const result = await prisma.guild.findUnique({
				where: { id: interaction.guildId }
			});

			if (result?.blacklistedChannels.includes(idToBlacklist)) {
				throw new AmanekoError('This channel is already blacklisted.');
			}

			await prisma.guild.upsert({
				where: { id: interaction.guildId },
				update: { blacklistedChannels: result ? [...result.blacklistedChannels, idToBlacklist] : [idToBlacklist] },
				create: { id: interaction.guildId, blacklistedChannels: [idToBlacklist] }
			});
		});

		return interaction.editReply({
			content: `Added **${idToBlacklist}** to the blacklist`
		});
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const idToUnblacklist = interaction.options.getString('id', true);

		await this.container.prisma.$transaction(async (prisma): Promise<unknown> => {
			const result = await prisma.guild.findUnique({
				where: { id: interaction.guildId }
			});

			if (!result) {
				throw new AmanekoError('There are no blacklisted channels.');
			}

			if (result.blacklistedChannels.includes(idToUnblacklist) === false) {
				throw new AmanekoError('This channel is not blacklisted');
			}

			const newBlacklist = result.blacklistedChannels.filter((channelId) => channelId !== idToUnblacklist);

			return prisma.guild.update({
				where: { id: interaction.guildId },
				data: {
					blacklistedChannels: newBlacklist
				}
			});
		});

		return interaction.editReply({
			content: `Removed **${idToUnblacklist}** from the blacklist`
		});
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const guildData = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId }
		});
		const blacklist = guildData?.blacklistedChannels;

		if (!blacklist || blacklist.length === 0) {
			const embed = this.blacklistEmbed([]);
			return interaction.editReply({ embeds: [embed] });
		}
		const menu = new PaginatedMessage();
		const chunkSize = 15;

		for (let i = 0; i < blacklist.length; i += chunkSize) {
			menu.addPageEmbed(this.blacklistEmbed(blacklist.slice(i, i + chunkSize)));
		}

		return menu.run(interaction);
	}

	private blacklistEmbed(blacklist: string[] = []): EmbedBuilder {
		const description: string = blacklist.length > 0 ? blacklist.join('\n') : 'No blacklisted channels.';

		return new EmbedBuilder().setColor(BrandColors.Default).setTitle('Youtube Blacklist').setDescription(description);
	}
}
