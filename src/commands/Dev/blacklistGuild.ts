import { AmanekoSubcommand } from '#lib/extensions/AmanekoSubcommand';
import { defaultReply, errorReply } from '#lib/utils/reply';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Manage the guild blacklist',
	preconditions: ['BotOwnerOnly'],
	subcommands: [
		{ name: 'add', chatInputRun: 'handleAdd' },
		{ name: 'remove', chatInputRun: 'handleRemove' },
		{ name: 'check', chatInputRun: 'handleCheck' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('blacklistguild')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('add')
							.setDescription('Add a guild to blacklist.')
							.addStringOption((option) =>
								option //
									.setName('guild')
									.setDescription('The ID of the guild.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('remove')
							.setDescription('Remove a guild blacklist.')
							.addStringOption((option) =>
								option //
									.setName('guild')
									.setDescription('The ID of the guild.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('check')
							.setDescription('Check if a guild is blacklisted.')
							.addStringOption((option) =>
								option //
									.setName('guild')
									.setDescription('The ID of the guild.')
									.setRequired(true)
							)
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const guildId = interaction.options.getString('guild', true);

		await this.container.prisma.guildBlacklist.upsert({
			where: { guildId },
			update: { guildId },
			create: { guildId }
		});

		try {
			const guild = interaction.client.guilds.cache.get(guildId);
			if (guild) {
				await guild.leave();
			}
		} catch (err: unknown) {
			return errorReply(interaction, `Failed to leave ${guildId}.`);
		}

		return defaultReply(interaction, `${guildId} has been added to the guild blacklist.`);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const guildId = interaction.options.getString('guild', true);

		try {
			await this.container.prisma.guildBlacklist.delete({
				where: { guildId }
			});
		} catch (err: unknown) {
			return errorReply(interaction, `Failed to remove the blacklist for ${guildId}.`);
		}

		return defaultReply(interaction, `${guildId} has been removed from the guild blacklist.`);
	}

	public async handleCheck(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const guildId = interaction.options.getString('guild', true);

		const result = await this.container.prisma.guildBlacklist.count({
			where: { guildId }
		});

		if (result > 1) {
			return defaultReply(interaction, `${guildId} is blacklisted.`);
		}

		return defaultReply(interaction, `${guildId} is not blacklisted.`);
	}
}
