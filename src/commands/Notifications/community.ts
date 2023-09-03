import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { BrandColors } from '#lib/utils/constants';
import { MeiliCategories } from '#lib/types/Meili';
import { channelLink } from '#lib/utils/youtube';
import { defaultReply, errorReply, successReply } from '#lib/utils/discord';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, channelMention, roleMention } from 'discord.js';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { HolodexChannel } from '@prisma/client';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Starts or stops sending community post notifications in the current channel.',
	subcommands: [
		{ name: 'add', chatInputRun: 'handleAdd' },
		{ name: 'remove', chatInputRun: 'handleRemove' },
		{ name: 'clear', chatInputRun: 'handleClear' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName('community')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('add')
							.setDescription('Add a community post subscription to the channel.')
							.addStringOption((option) =>
								option //
									.setName('channel')
									.setDescription('The name of the YouTube channel.')
									.setAutocomplete(true)
									.setRequired(true)
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to ping for notifications.')
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('remove')
							.setDescription('Remove a community post subscription from the channel.')
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
							.setDescription('Clear all community post subscriptions in a channel.')
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('list')
							.setDescription('List all of the community post subscriptions in the server.')
					),
			{
				idHints: [],
				guildIds: []
			}
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
				where: { guildId: interaction.guildId, communityPostChannelId: { not: null } },
				select: { channel: true }
			});
			if (channels.length < 1) return interaction.respond([]);

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
		const role = interaction.options.getRole('role');

		const channel = await this.container.prisma.holodexChannel.findUnique({
			where: { id: channelId },
			select: { id: true }
		});
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const data = await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			update: {
				communityPostChannelId: interaction.channelId,
				communityPostRoleId: role?.id
			},
			create: {
				communityPostChannelId: interaction.channelId,
				communityPostRoleId: role?.id,
				channel: { connect: { id: channel.id } },
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				}
			},
			select: { channel: true }
		});

		const embed = this.communityPostEmbed(data.channel, role?.id);
		return interaction.editReply({
			content: `New community posts will now be sent to this channel.`,
			embeds: [embed]
		});
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = await this.container.prisma.holodexChannel.findUnique({
			where: { id: channelId },
			select: { id: true, name: true }
		});
		if (!channel) {
			return errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const data = await this.container.prisma.subscription
			.update({
				where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
				data: { communityPostChannelId: null, communityPostRoleId: null },
				select: { channel: true }
			})
			.catch(() => null);
		if (!data) {
			return errorReply(interaction, `Community posts for ${channel.name} weren't being sent to this channel.`);
		}

		return successReply(interaction, `Community posts for ${data.channel.name} will no longer be sent to this channel.`);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId, communityPostChannelId: interaction.channelId },
			data: { communityPostChannelId: null, communityPostRoleId: null }
		});

		return successReply(interaction, 'Community posts will no longer be sent in this channel.');
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const data = await this.container.prisma.subscription.findMany({
			where: { guildId: interaction.guildId, communityPostChannelId: { not: null } },
			select: {
				channel: { select: { id: true, name: true } },
				communityPostChannelId: true,
				communityPostRoleId: true
			}
		});

		if (data.length === 0) {
			return defaultReply(interaction, 'There are no community posts being sent to this server.');
		}

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Community Post settings')
			.setDescription(
				data
					.map(({ channel, communityPostChannelId, communityPostRoleId }) => {
						const role = communityPostRoleId //
							? ` mentioning ${roleMention(communityPostRoleId)}`
							: '';
						return `${channelLink(channel.name, channel.id)} in ${channelMention(communityPostChannelId!)}${role}`;
					})
					.join('\n')
			);

		return interaction.editReply({
			embeds: [embed]
		});
	}

	private communityPostEmbed(channel: HolodexChannel, roleId?: string | null): EmbedBuilder {
		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setThumbnail(channel.image)
			.setTitle(`Community posts for: ${channel.name}`)
			.setDescription(
				`YouTube channel ID: ${channel.id}\nRole: ${
					roleId //
						? roleMention(roleId)
						: 'No role set.'
				}`
			);
	}
}
