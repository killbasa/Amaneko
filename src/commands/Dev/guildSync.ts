import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { errorReply, successReply } from '#lib/utils/discord';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: "Sync a guild's cache",
	preconditions: ['BotOwnerOnly']
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('guildsync')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addStringOption((option) =>
						option //
							.setName('guild')
							.setDescription('The ID of the guild')
							.setRequired(true)
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<unknown> {
		const guildId = interaction.options.getString('guild', true);

		const settings = await this.container.prisma.guild.findUnique({
			where: { id: guildId },
			select: {
				relayMods: true,
				relayTranslations: true,
				blacklist: { select: { channelId: true } }
			}
		});
		if (!settings) return errorReply(interaction, 'Guild not found');

		this.container.client.settings.set(guildId, {
			relayMods: settings.relayMods,
			relayTranslations: settings.relayTranslations,
			blacklist: new Set(settings.blacklist.map(({ channelId }) => channelId))
		});

		return successReply(interaction, `${guildId} synced with cache.`);
	}
}
