import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { MeiliCategories } from '#lib/types/Meili';
import { BrandColors } from '#lib/utils/constants';
import { defaultReply, errorReply, successReply } from '#lib/utils/discord';
import { channelLink } from '#lib/utils/youtube';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, EmbedBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: "Start or stop sending a streamer's cameos.",
	runIn: [ChannelType.GuildAnnouncement, ChannelType.GuildText],
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
				.setName('cameo')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('add')
						.setDescription('Add a cameo subscription to this channel.')
						.addStringOption((option) =>
							option //
								.setName('channel')
								.setDescription('The name of the YouTube channel.')
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('remove')
						.setDescription('Remove a cameo subscription from this channel.')
						.addStringOption((option) =>
							option //
								.setName('subscription')
								.setDescription('The name of the YouTube channel to remove.')
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('clear')
						.setDescription('Clear all cameo subscriptions in this channel.')
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('The channel to clear community post subscriptions from.')
								.addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('list')
						.setDescription('List all of the cameo subscriptions in the server.')
				)
		);
	}

	public override async autocompleteRun(interaction: AmanekoSubcommand.AutocompleteInteraction): Promise<void> {
		const focusedOption = interaction.options.getFocused(true);

		let options: ApplicationCommandOptionChoiceData[] = [];

		if (focusedOption.name === 'channel') {
			const result = await this.container.meili.get(MeiliCategories.HolodexChannels, focusedOption.value);

			options = result.hits.map(({ name, englishName, id }) => ({
				name: englishName ?? name,
				value: id
			}));
		} else if (focusedOption.name === 'subscription') {
			const channels = await this.container.prisma.subscription.findMany({
				where: { guildId: interaction.guildId, cameoChannelId: { not: null } },
				select: { channel: true }
			});
			if (channels.length === 0) return interaction.respond([]);

			options = channels.map(({ channel }) => ({
				name: channel.name,
				value: channel.id
			}));
		}

		return interaction.respond(options);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('channel', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			update: {
				cameoChannelId: interaction.channelId
			},
			create: {
				cameoChannelId: interaction.channelId,
				channel: { connect: { id: channel.id } },
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				}
			}
		});

		return successReply(interaction, `Cameos from ${channel.name} will now be sent to this channel.`);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const data = await this.container.prisma.subscription
			.update({
				where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
				data: { cameoChannelId: null }
			})
			.catch(() => null);
		if (!data) {
			return errorReply(interaction, `Cameos for ${channel.name} were not being sent to this channel.`);
		}

		return successReply(interaction, `Cameos for ${channel.name} will no longer be sent to this channel.`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const discordChannel = interaction.options.getChannel('discord_channel', false, [ChannelType.GuildAnnouncement, ChannelType.GuildText]);

		const channelId = discordChannel?.id ?? interaction.channelId;
		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId, cameoChannelId: channelId },
			data: { cameoChannelId: null }
		});

		return successReply(interaction, `Cameos will no longer be sent in ${channelMention(channelId)}`);
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const data = await this.container.prisma.subscription.findMany({
			where: { guildId: interaction.guildId, cameoChannelId: { not: null } },
			select: {
				channel: { select: { id: true, name: true } },
				cameoChannelId: true
			}
		});

		if (data.length === 0) {
			return defaultReply(interaction, 'There are no cameos being sent to this server.');
		}

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Cameo settings')
			.setDescription(
				data
					.map(({ channel, cameoChannelId }) => {
						return `${channelLink(channel.name, channel.id)} in ${channelMention(cameoChannelId!)}`;
					})
					.join('\n')
			);

		return interaction.editReply({
			embeds: [embed]
		});
	}
}
