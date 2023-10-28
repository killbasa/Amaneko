import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { MeiliCategories } from '#lib/types/Meili';
import { BrandColors, NotifChannelTypes } from '#lib/utils/constants';
import { defaultReply, errorReply, successReply } from '#lib/utils/reply';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { channelLink } from '#lib/utils/youtube';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: "Start or stop relaying a streamer's translations.",
	runIn: NotifChannelTypes,
	subcommands: [
		{ name: 'add', chatInputRun: 'handleAdd' },
		{ name: 'remove', chatInputRun: 'handleRemove' },
		{ name: 'settings', chatInputRun: 'handleSettings' },
		{ name: 'clear', chatInputRun: 'handleClear' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('relay')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('add')
						.setDescription('Add a relay subscription to this channel.')
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
						.setDescription('Remove a relay subscription.')
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
						.setName('settings')
						.setDescription('Enable or disable translations and moderator messages. Leave empty to check current settings.')
						.addBooleanOption((option) =>
							option //
								.setName('moderators')
								.setDescription('Enable or disable moderator messages.')
						)
						.addBooleanOption((option) =>
							option //
								.setName('translations')
								.setDescription('Enable or disable translations.')
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('clear')
						.setDescription('Remove all relay subscriptions from a channel. (Default: this channel)')
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('The channel to clear relay subscriptions from.')
								.addChannelTypes(...NotifChannelTypes)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('list')
						.setDescription('List all of the relay subscriptions in the server.')
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
				where: { guildId: interaction.guildId, relayChannelId: { not: null } },
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

		const count = await this.container.prisma.subscription.count({
			where: {
				guildId: interaction.guildId,
				relayChannelId: { not: null }
			}
		});
		if (count >= 25) {
			return defaultReply(interaction, 'You can only have a maximum of 25 relay subscriptions.');
		}

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		if (!canSendGuildMessages(interaction.channel)) {
			return errorReply(interaction, `I am not able to send messages in ${channelMention(interaction.channelId)}`);
		}

		await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			update: {
				relayChannelId: interaction.channelId
			},
			create: {
				relayChannelId: interaction.channelId,
				channel: { connect: { id: channel.id } },
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				}
			}
		});

		return successReply(interaction, `Relays from ${channel.name} will now be sent to this channel.`);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const oldSettings = await this.container.prisma.subscription.findUnique({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			select: { relayChannelId: true }
		});
		if (!oldSettings?.relayChannelId) {
			return defaultReply(interaction, `Relays for ${channel.name} are not being sent to this server.`);
		}

		await this.container.prisma.subscription.update({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			data: { relayChannelId: null }
		});

		return successReply(interaction, `Relays for ${channel.name} will no longer be sent to ${channelMention(oldSettings.relayChannelId)}`);
	}

	public async handleSettings(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const enableMods = interaction.options.getBoolean('moderators');
		const enableTls = interaction.options.getBoolean('translations');

		if (enableMods === null && enableTls === null) {
			const embed = await this.formatSettings(interaction);
			return interaction.editReply({
				embeds: [embed]
			});
		}

		await this.container.prisma.guild.upsert({
			where: { id: interaction.guildId },
			update: {
				relayMods: enableMods ?? undefined,
				relayTranslations: enableTls ?? undefined
			},
			create: {
				id: interaction.guildId,
				relayMods: enableMods ?? undefined,
				relayTranslations: enableTls ?? undefined
			}
		});

		return successReply(interaction, `The new relay settings have been successfully applied.`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const discordChannel = interaction.options.getChannel('discord_channel', false, NotifChannelTypes);

		const channelId = discordChannel?.id ?? interaction.channelId;
		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId, relayChannelId: channelId },
			data: { relayChannelId: null }
		});

		return successReply(interaction, `Relays will no longer be sent in ${channelMention(channelId)}`);
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const data = await this.container.prisma.subscription.findMany({
			where: { guildId: interaction.guildId, relayChannelId: { not: null } },
			select: {
				channel: { select: { id: true, name: true } },
				relayChannelId: true
			}
		});

		if (data.length === 0) {
			return defaultReply(interaction, 'There are no relays being sent to this server. You can add one with `/relay add`.');
		}

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Relay settings')
			.setDescription(
				data
					.map(({ channel, relayChannelId }) => {
						return `${channelLink(channel.name, channel.id)} in ${channelMention(relayChannelId!)}`;
					})
					.join('\n')
			);

		return interaction.editReply({
			embeds: [embed]
		});
	}

	private async formatSettings(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<EmbedBuilder> {
		const guild = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId }
		});

		return new EmbedBuilder()
			.setColor(BrandColors.Default)
			.setTitle('Relay settings')
			.addFields(
				{ name: 'Moderator messages', value: `${guild?.relayMods === false ? '❌' : '✅'}` },
				{ name: 'Translation messages', value: `${guild?.relayTranslations === false ? '❌' : '✅'}` }
			);
	}
}
