import { getUsername } from '#utils/youtube';
import { errorReply, successReply } from '#lib/utils/reply';
import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Blacklist a user from relays.',
	runIn: ['GUILD_ANY']
})
export class ContextCommand extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerContextMenuCommand((builder) =>
			builder //
				.setName('Blacklist User')
				.setType(ApplicationCommandType.Message)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		);
	}

	public override async contextMenuRun(interaction: AmanekoCommand.ContextMenuCommandInteraction): Promise<unknown> {
		await interaction.deferReply();

		const messageId = interaction.targetId;

		const userToBlacklist = await this.container.prisma.streamComment.findUnique({
			where: { messageId },
			select: { channelId: true }
		});
		if (!userToBlacklist?.channelId) {
			return errorReply(interaction, 'This message is either not a stream comment or the stream is over.');
		}

		const blacklistedUsername = await getUsername(userToBlacklist.channelId);

		const blacklistedUser = await this.container.prisma.blacklist.upsert({
			where: { channelId_guildId: { channelId: userToBlacklist.channelId, guildId: interaction.guildId } },
			update: {
				channelId: userToBlacklist.channelId,
				channelName: blacklistedUsername
			},
			create: {
				channelId: userToBlacklist.channelId,
				channelName: blacklistedUsername,
				guild: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: { id: interaction.guildId }
					}
				}
			}
		});

		return successReply(interaction, `Added **${blacklistedUser.channelName}** to the blacklist.`);
	}
}
