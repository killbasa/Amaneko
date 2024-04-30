import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { MeiliCategories } from '../../lib/types/Meili.js';
import { BrandColors, NotifChannelTypes } from '../../lib/utils/constants.js';
import { canSendGuildMessages } from '../../lib/utils/permissions.js';
import { defaultReply, errorReply, successReply } from '../../lib/utils/reply.js';
import { EmbedBuilder, PermissionFlagsBits, channelLink, channelMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: "Start or stop sending a streamer's cameos.",
	runIn: NotifChannelTypes,
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
						.setDescription('Remove all cameo subscriptions from a channel. (Default: this channel)')
						.addChannelOption((option) =>
							option //
								.setName('discord_channel')
								.setDescription('The channel to clear cameo subscriptions from.')
								.addChannelTypes(...NotifChannelTypes)
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
			if (channels.length === 0) {
				await interaction.respond([]);
				return;
			}

			options = channels.map(({ channel }) => ({
				name: channel.name,
				value: channel.id
			}));
		}

		await interaction.respond(options);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('channel', true);

		const count = await this.container.prisma.subscription.count({
			where: {
				guildId: interaction.guildId,
				cameoChannelId: { not: null }
			}
		});
		if (count >= 25) {
			return await defaultReply(interaction, 'You can only have a maximum of 25 cameo subscriptions.');
		}

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		if (!canSendGuildMessages(interaction.channel)) {
			return await errorReply(interaction, `I am not able to send messages in ${channelMention(interaction.channelId)}`);
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

		return await successReply(
			interaction, //
			`Cameos from ${channelLink(channel.name, channel.id)} will now be sent to this channel.`
		);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const oldSettings = await this.container.prisma.subscription.findUnique({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			select: { cameoChannelId: true }
		});
		if (!oldSettings?.cameoChannelId) {
			return await defaultReply(
				interaction, //
				`Cameos for ${channelLink(channel.name, channel.id)} are not being sent to this server.`
			);
		}

		await this.container.prisma.subscription.update({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			data: { cameoChannelId: null }
		});

		return await successReply(
			interaction,
			`Cameos for ${channelLink(channel.name, channel.id)} will no longer be sent to ${channelMention(oldSettings.cameoChannelId)}`
		);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const discordChannel = interaction.options.getChannel('discord_channel', false, NotifChannelTypes);

		const channelId = discordChannel?.id ?? interaction.channelId;
		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId, cameoChannelId: channelId },
			data: { cameoChannelId: null }
		});

		return await successReply(interaction, `Cameos will no longer be sent in ${channelMention(channelId)}`);
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
			return await defaultReply(interaction, 'There are no cameos being sent to this server. You can add one with `/cameo add`.');
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

		return await interaction.editReply({
			embeds: [embed]
		});
	}
}
