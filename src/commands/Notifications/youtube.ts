import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { MeiliCategories } from '../../lib/types/Meili.js';
import { BrandColors, NotifChannelTypes } from '../../lib/utils/constants.js';
import { canSendGuildEmbeds } from '../../lib/utils/permissions.js';
import { defaultReply, errorReply, successReply } from '../../lib/utils/reply.js';
import { EmbedBuilder, PermissionFlagsBits, Role, channelLink, channelMention, roleMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { ApplicationCommandRegistry } from '@sapphire/framework';
import type { HolodexChannel, Prisma } from '@prisma/client';
import type { LivestreamSubscription } from '../../lib/types/YouTube.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Manage YouTube livestream notifications.',
	runIn: NotifChannelTypes,
	subcommands: [
		{ name: 'subscribe', chatInputRun: 'handleSubscribe' },
		{ name: 'unsubscribe', chatInputRun: 'handleUnsubscribe' },
		{
			name: 'member',
			type: 'group',
			entries: [
				{ name: 'subscribe', chatInputRun: 'handleMemberSubscribe' },
				{ name: 'unsubscribe', chatInputRun: 'handleMemberUnsubscribe' }
			]
		},
		{ name: 'clear', chatInputRun: 'handleClear' },
		{ name: 'list', chatInputRun: 'handleList' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry): void {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName('youtube')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('subscribe')
						.setDescription('Add a YouTube livestream notification to this channel.')
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
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('unsubscribe')
						.setDescription("Remove a YouTube channel's livestream notification.")
						.addStringOption((option) =>
							option //
								.setName('subscription')
								.setDescription('The name of the YouTube channel.')
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
				.addSubcommandGroup((group) =>
					group
						.setName('member')
						.setDescription('Manage YouTube member livestream notifications.')
						.addSubcommand((subcommand) =>
							subcommand
								.setName('subscribe')
								.setDescription('Add a YouTube member livestream notification to this channel.')
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
										.setRequired(false)
								)
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('unsubscribe')
								.setDescription("Remove a YouTube channel's member livestream notification.")
								.addStringOption((option) =>
									option //
										.setName('subscription')
										.setDescription('The name of the YouTube channel.')
										.setAutocomplete(true)
										.setRequired(true)
								)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('clear')
						.setDescription('Remove all YouTube livestream notifications from a channel. (Default: this channel)')
						.addChannelOption((option) =>
							option
								.setName('discord_channel')
								.setDescription('The channel to clear YouTube livestream notifications from.')
								.addChannelTypes(...NotifChannelTypes)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand //
						.setName('list')
						.setDescription('List all YouTube livestream notifications in the server.')
				);
		});
	}

	public override async autocompleteRun(interaction: AmanekoSubcommand.AutocompleteInteraction): Promise<void> {
		const focusedOption = interaction.options.getFocused(true);

		let options: ApplicationCommandOptionChoiceData[] = [];

		if (focusedOption.name === 'channel') {
			const results = await this.container.meili.get(MeiliCategories.HolodexChannels, focusedOption.value);

			options = results.hits.map(({ name, englishName, id }) => ({
				name: englishName ?? name,
				value: id
			}));
		} else if (focusedOption.name === 'subscription') {
			const subcommand = interaction.options.getSubcommandGroup();

			const query: Prisma.SubscriptionWhereInput =
				subcommand === 'member' //
					? { memberDiscordChannelId: { not: null } }
					: { discordChannelId: { not: null } };

			const channels = await this.container.prisma.subscription.findMany({
				where: { guildId: interaction.guildId, ...query },
				select: { channel: true }
			});

			options = channels
				.filter(({ channel }) => (channel.englishName ?? channel.name).startsWith(focusedOption.value))
				.map(({ channel }) => ({
					name: channel.name,
					value: channel.id
				}));
		}

		await interaction.respond(options);
	}

	public async handleSubscribe(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('channel', true);
		const role = interaction.options.getRole('role');

		const count = await this.container.prisma.subscription.count({
			where: {
				guildId: interaction.guildId,
				discordChannelId: { not: null },
				memberDiscordChannelId: { not: null }
			}
		});
		if (count >= 25) {
			return await defaultReply(interaction, 'You can only have a maximum of 25 livestream subscriptions.');
		}

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		if (!canSendGuildEmbeds(interaction.channel)) {
			return await errorReply(interaction, `I am not able to send embeds in ${channelMention(interaction.channelId)}`);
		}

		await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { channelId, guildId: interaction.guildId } },
			update: {
				discordChannelId: interaction.channelId,
				roleId: role?.id
			},
			create: {
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				},
				roleId: role?.id,
				discordChannelId: interaction.channelId,
				channel: { connect: { id: channelId } }
			}
		});

		const embed = this.youtubeEmbedBuilder(channel, role);
		return await interaction.editReply({
			content: `Livestream notifications will now be sent to this channel.`,
			embeds: [embed]
		});
	}

	public async handleUnsubscribe(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const subscriptionData = await this.container.prisma.subscription
			.update({
				where: { channelId_guildId: { channelId, guildId: interaction.guildId } },
				data: {
					roleId: null,
					discordChannelId: null
				}
			})
			.catch(() => null);

		if (!subscriptionData) {
			return await errorReply(
				interaction, //
				`Livestream notifications for **${channelLink(channel.name, channel.id)}** are not being sent to this server.`
			);
		}

		return await successReply(
			interaction,
			`Livestream notifications for **${channelLink(channel.name, channel.id)}** will no longer be sent to this server.`
		);
	}

	public async handleMemberSubscribe(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('channel', true);
		const role = interaction.options.getRole('role');

		const count = await this.container.prisma.subscription.count({
			where: {
				guildId: interaction.guildId,
				discordChannelId: { not: null },
				memberDiscordChannelId: { not: null }
			}
		});
		if (count >= 25) {
			return await defaultReply(interaction, 'You can only have a maximum of 25 livestream subscriptions.');
		}

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		if (!canSendGuildEmbeds(interaction.channel)) {
			return await errorReply(interaction, `I am not able to send embeds in ${channelMention(interaction.channelId)}`);
		}

		await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { channelId, guildId: interaction.guildId } },
			update: {
				memberDiscordChannelId: interaction.channelId,
				memberRoleId: role?.id
			},
			create: {
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				},
				memberRoleId: role?.id,
				memberDiscordChannelId: interaction.channelId,
				channel: { connect: { id: channelId } }
			}
		});

		const embed = this.youtubeEmbedBuilder(channel, role);

		return await interaction.editReply({
			content: `Member livestream notifications will now be sent to this channel.`,
			embeds: [embed]
		});
	}

	public async handleMemberUnsubscribe(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('subscription', true);

		const channel = this.container.cache.holodexChannels.get(channelId);
		if (!channel) {
			return await errorReply(interaction, 'I was not able to find a channel with that name.');
		}

		const subscriptionData = await this.container.prisma.subscription
			.update({
				where: { channelId_guildId: { channelId, guildId: interaction.guildId } },
				data: {
					memberRoleId: null,
					memberDiscordChannelId: null
				}
			})
			.catch(() => null);

		if (!subscriptionData) {
			return await errorReply(
				interaction,
				`Member livestream notifications for **${channelLink(channel.name, channel.id)}** are not being sent to this server.`
			);
		}

		return await successReply(
			interaction,
			`Member livestream notifications for **${channelLink(channel.name, channel.id)}** will no longer be sent to this server.`
		);
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channel = interaction.options.getChannel('discord_channel', false, NotifChannelTypes);

		if (channel) {
			await this.container.prisma.subscription.updateMany({
				where: {
					guildId: interaction.guildId,
					OR: [{ discordChannelId: channel.id }, { memberDiscordChannelId: channel.id }]
				},
				data: {
					discordChannelId: null,
					memberDiscordChannelId: null,
					roleId: null,
					memberRoleId: null
				}
			});

			return await successReply(interaction, `Livestream notifications will no longer be sent to ${channelMention(channel.id)}.`);
		}
		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId },
			data: {
				roleId: null,
				memberRoleId: null,
				discordChannelId: null,
				memberDiscordChannelId: null
			}
		});

		return await successReply(interaction, `Livestream notifications will no longer be sent to this server.`);
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				OR: [{ discordChannelId: { not: null } }, { memberDiscordChannelId: { not: null } }]
			},
			include: { channel: true }
		});

		if (subscriptions.length === 0) {
			return await defaultReply(
				interaction,
				'This server is not subscribed to any channels. You can add one with `/youtube subscribe` or `/youtube member subscribe`.'
			);
		}

		const subscriptionsPaginatedMessage = new PaginatedMessage()
			.setSelectMenuOptions((pageIndex) => ({ label: subscriptions[pageIndex - 1].channel.englishName ?? subscriptions[pageIndex - 1].channel.name }))
			.setSelectMenuPlaceholder(`Select a subscription`);

		for (const subscription of subscriptions) {
			subscriptionsPaginatedMessage.addPageEmbed(this.subscriptionEmbedBuilder(subscription));
		}

		return await subscriptionsPaginatedMessage.run(interaction);
	}

	private subscriptionEmbedBuilder({
		channel,
		roleId,
		discordChannelId,
		memberRoleId,
		memberDiscordChannelId
	}: LivestreamSubscription): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(BrandColors.Default)
			.setAuthor({ name: 'Youtube notification settings' })
			.setThumbnail(channel.image)
			.setTitle(`${channel.englishName ?? channel.name}`)
			.setURL(`https://www.youtube.com/channel/${channel.id}`)
			.addFields(
				{
					name: 'Channel',
					value: discordChannelId ? channelMention(discordChannelId) : 'No channel set.',
					inline: true
				},
				{ name: 'Role', value: roleId ? roleMention(roleId) : 'No role set.', inline: true },
				{ name: '\u200B', value: '\u200B' },
				{
					name: 'Member Channel',
					value: memberDiscordChannelId ? channelMention(memberDiscordChannelId) : 'No channel set.',
					inline: true
				},
				{ name: 'Member Role', value: memberRoleId ? roleMention(memberRoleId) : 'No role set.', inline: true }
			);
	}

	private youtubeEmbedBuilder(channel: HolodexChannel, role: Role | null): EmbedBuilder {
		return new EmbedBuilder()
			.setColor(BrandColors.Default)
			.setThumbnail(channel.image)
			.setTitle(`Youtube notifications for: ${channel.englishName ?? channel.name}`)
			.setDescription(`Role: ${role?.id ? roleMention(role.id) : 'No role set.'}`);
	}
}
