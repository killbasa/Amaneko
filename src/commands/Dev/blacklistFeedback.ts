import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { defaultReply, errorReply } from '../../lib/utils/reply.js';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Manage the feedback blacklist',
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
					.setName('dev_blacklistfeedback')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('add')
							.setDescription('Add a user to the feedback blacklist.')
							.addStringOption((option) =>
								option //
									.setName('user')
									.setDescription('The ID of the user.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('remove')
							.setDescription('Remove a user from the feedback blacklist.')
							.addStringOption((option) =>
								option //
									.setName('user')
									.setDescription('The ID of the user.')
									.setRequired(true)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('check')
							.setDescription('Check if a user is blacklisted.')
							.addStringOption((option) =>
								option //
									.setName('user')
									.setDescription('The ID of the user.')
									.setRequired(true)
							)
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public async handleAdd(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const userId = interaction.options.getString('user', true);

		await this.container.prisma.feedbackBlacklist.upsert({
			where: { userId },
			update: { userId },
			create: { userId }
		});

		return await defaultReply(interaction, `\`${userId}\` has been added to the feedback blacklist.`);
	}

	public async handleRemove(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const userId = interaction.options.getString('user', true);

		try {
			await this.container.prisma.feedbackBlacklist.delete({
				where: { userId }
			});
		} catch (err: unknown) {
			return await errorReply(interaction, `Failed to remove the blacklist for \`${userId}\`.`);
		}

		return await defaultReply(interaction, `\`${userId}\` has been removed from the feedback blacklist.`);
	}

	public async handleCheck(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const userId = interaction.options.getString('user', true);

		const result = await this.container.prisma.feedbackBlacklist.findUnique({
			where: { userId }
		});

		if (result !== null) {
			return await defaultReply(interaction, `\`${userId}\` is blacklisted.`);
		}

		return await defaultReply(interaction, `\`${userId}\` is not blacklisted.`);
	}
}
