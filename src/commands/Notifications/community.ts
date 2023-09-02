import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { BrandColors } from '#lib/utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, channelMention, roleMention } from 'discord.js';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
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
					.setDMPermission(true)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('add')
							.setDescription('Add a channel from which to notify community posts.')
							.addStringOption((option) =>
								option //
									.setName('channel')
									.setDescription('idk')
							)
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('idk')
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('remove')
							.setDescription('Remove a channel from which to notify community posts.')
							.addStringOption((option) =>
								option //
									.setName('channel')
									.setDescription('idk')
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('clear')
							.setDescription('Clear all channels from which to notify community posts.')
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('list')
							.setDescription('Clear all channels from which to notify community posts.')
					),
			{
				idHints: [],
				guildIds: []
			}
		);
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
			return interaction.editReply('I was not able to find a channel with that name.');
		}

		const data = await this.container.prisma.subscription.upsert({
			where: { channelId_guildId: { guildId: interaction.guildId, channelId: channel.id } },
			update: {
				communityPostChannelId: interaction.channelId,
				communityPostRoleId: role?.id
			},
			create: {
				channelId: channel.id,
				guildId: interaction.guildId,
				communityPostChannelId: interaction.channelId,
				communityPostRoleId: role?.id
			},
			select: {
				channel: true
			}
		});

		const embed = this.communityPostEmbed(data.channel, interaction.channelId, role?.id);
		return interaction.editReply({
			content: `New community posts will now be sent to this channel.`,
			embeds: [embed]
		});
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const channelId = interaction.options.getString('channel', true);

		const data = await this.container.prisma.subscription
			.update({
				where: { channelId_guildId: { guildId: interaction.guildId, channelId } },
				data: { communityPostChannelId: null, communityPostRoleId: null },
				select: { channel: true }
			})
			.catch(() => null);
		if (!data) {
			return interaction.editReply(`Community posts for ${channelId} weren't being sent to this channel.`);
		}

		return interaction.editReply({
			content: `Community posts for ${data.channel.name} (${data.channel.englishName}) will no longer be sent to this channel.`
		});
	}

	public async handleClear(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		await this.container.prisma.subscription.updateMany({
			where: { guildId: interaction.guildId, communityPostChannelId: interaction.channelId },
			data: { communityPostChannelId: null, communityPostRoleId: null }
		});

		return interaction.editReply({
			content: 'Community posts will no longer be sent in this channel.'
		});
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const data = await this.container.prisma.subscription.findMany({
			where: { guildId: interaction.guildId, communityPostChannelId: interaction.channelId },
			include: { channel: true }
		});

		if (data.length === 0) {
			return interaction.editReply({
				content: 'There are no community posts being sent to this channel.'
			});
		}

		const menu = new PaginatedMessage();

		for (const { channel, communityPostChannelId, communityPostRoleId } of data) {
			menu.addPageEmbed(this.communityPostEmbed(channel, communityPostChannelId!, communityPostRoleId));
		}

		return menu.run(interaction);
	}

	private communityPostEmbed(channel: HolodexChannel, channelId: string, roleId?: string | null): EmbedBuilder {
		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setThumbnail(channel.image)
			.setTitle(`Community posts for: ${channel.name} (${channel.englishName})`)
			.setDescription(
				`YouTube channel ID: ${channel.id}\nChannel: ${channelMention(channelId)}\nRole: ${
					roleId //
						? roleMention(roleId)
						: 'No role set.'
				}`
			);
	}
}
