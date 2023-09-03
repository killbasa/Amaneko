import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { AmanekoError } from '#lib/structures/AmanekoError';
import { BrandColors } from '#lib/utils/constants';
import { errorReply } from '#lib/utils/discord';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, roleMention } from 'discord.js';
import type { ApplicationCommandOptionChoiceData, Role } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Add or remove a role to the bot admin list.',
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
					.setName('admins')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('add')
							.setDescription('Add a role to the bot admin list.')
							.addRoleOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to add.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('remove')
							.setDescription('Remove a role from the bot admin list.')
							.addStringOption((option) =>
								option //
									.setName('role')
									.setDescription('The role to remove.')
									.setAutocomplete(true)
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('list')
							.setDescription('Check the bot admin list.')
					),
			{
				idHints: [],
				guildIds: []
			}
		);
	}

	public override async autocompleteRun(interaction: AmanekoSubcommand.AutocompleteInteraction): Promise<unknown> {
		const data = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { adminRoles: true }
		});

		if (!data) {
			return interaction.respond([]);
		}

		const roles: Role[] = data.adminRoles //
			.map((roleId) => interaction.guild.roles.cache.get(roleId))
			.filter((role): role is Role => role !== undefined);

		const options: ApplicationCommandOptionChoiceData[] = roles.map((role) => {
			return { name: role.name, value: role.id };
		});

		return interaction.respond(options);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const role = interaction.options.getRole('role', true);

		const data = await this.container.prisma.$transaction(async (prisma) => {
			const result = await prisma.guild.findUnique({
				where: { id: interaction.guildId },
				select: { adminRoles: true }
			});

			if (result?.adminRoles.includes(role.id)) {
				throw new AmanekoError('That role is already in the bot admin list.');
			}

			const adminRoles = result //
				? [...result.adminRoles, role.id]
				: [role.id];

			return prisma.guild.upsert({
				where: { id: interaction.guildId },
				update: { adminRoles },
				create: { id: interaction.guildId, adminRoles }
			});
		});

		const embed = this.adminListEmbed(data.adminRoles);
		return interaction.editReply({
			content: `Added ${roleMention(role.id)} to the bot admin list`,
			embeds: [embed]
		});
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();
		const roleId = interaction.options.getString('role', true);

		const role = interaction.guild.roles.cache.get(roleId);
		if (!role) {
			return errorReply(interaction, 'A role with that name does not exist.');
		}

		const data = await this.container.prisma.$transaction(async (prisma) => {
			const result = await prisma.guild.findUnique({
				where: { id: interaction.guildId },
				select: { adminRoles: true }
			});

			if (!result) {
				throw new AmanekoError('There are no admins roles to remove.');
			}

			if (!result.adminRoles.includes(role.id)) {
				throw new AmanekoError('That role is not set as an admin role.');
			}

			const newAdminRoles = result.adminRoles.filter((roleId) => roleId !== role.id);

			return prisma.guild.update({
				where: { id: interaction.guildId },
				data: { adminRoles: { set: newAdminRoles } },
				select: { adminRoles: true }
			});
		});

		const embed = this.adminListEmbed(data.adminRoles);
		return interaction.editReply({
			content: `Removed ${roleMention(role.id)} from the bot admin list`,
			embeds: [embed]
		});
	}

	public async handleList(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const data = await this.container.prisma.guild.findUnique({
			where: { id: interaction.guildId },
			select: { adminRoles: true }
		});

		const embed = this.adminListEmbed(data?.adminRoles);
		return interaction.editReply({ embeds: [embed] });
	}

	private adminListEmbed(roles: string[] = []): EmbedBuilder {
		const description: string =
			roles.length > 0 //
				? roles.map((role) => `${roleMention(role)}`).join('\n')
				: 'No bot admin roles set.';

		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Admin list')
			.setDescription(description);
	}
}
