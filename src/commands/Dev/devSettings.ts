import { AmanekoSubcommand } from '../../lib/extensions/AmanekoSubcommand.js';
import { BrandColors, DevSettingsKey } from '../../lib/utils/constants.js';
import { canSendGuildEmbeds } from '../../lib/utils/permissions.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, EmbedBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import type { DevSettings } from '../../lib/types/Dev.js';

@ApplyOptions<AmanekoSubcommand.Options>({
	description: 'Manage dev settings',
	preconditions: ['BotOwnerOnly'],
	subcommands: [
		{ name: 'set', chatInputRun: 'handleSet' },
		{ name: 'unset', chatInputRun: 'handleUnset' },
		{ name: 'check', chatInputRun: 'handleCheck' }
	]
})
export class Command extends AmanekoSubcommand {
	public override registerApplicationCommands(registry: AmanekoSubcommand.Registry): void {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName('dev_settings')
					.setDescription(this.description)
					.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
					.setDMPermission(false)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('set')
							.setDescription('Add dev settings.')
							.addChannelOption((option) =>
								option //
									.setName('feedback')
									.setDescription('Set a feedback channel.')
									.addChannelTypes(ChannelType.GuildText)
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('unset')
							.setDescription('Remove dev settings.')
							.addBooleanOption((option) =>
								option //
									.setName('feedback')
									.setDescription('Remove the set feedback channel.')
							)
					)
					.addSubcommand((subcommand) =>
						subcommand //
							.setName('check')
							.setDescription('Check dev settings.')
					),
			{
				guildIds: [this.container.config.discord.devServer]
			}
		);
	}

	public async handleSet(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const feedbackChannel = interaction.options.getChannel('feedback', false, [ChannelType.GuildText]);
		const settings = await this.getSettings();
		const warnings: string[] = [];

		if (feedbackChannel) {
			if (canSendGuildEmbeds(feedbackChannel)) {
				settings.feedback = feedbackChannel.id;
			} else {
				warnings.push(`• I can't send embeds in ${feedbackChannel}`);
			}
		}

		await this.saveSettings(settings);

		return await interaction.reply({
			embeds: [await this.showSettings(settings, warnings)]
		});
	}

	public async handleUnset(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const feedbackChannel = interaction.options.getBoolean('feedback');
		const settings = await this.getSettings();

		if (feedbackChannel) {
			settings.feedback = null;
		}

		await this.saveSettings(settings);

		return await interaction.reply({
			embeds: [await this.showSettings(settings)]
		});
	}

	public async handleCheck(interaction: AmanekoSubcommand.ChatInputCommandInteraction): Promise<unknown> {
		const settings = await this.getSettings();

		return await interaction.reply({
			embeds: [await this.showSettings(settings)]
		});
	}

	private async getSettings(): Promise<DevSettings> {
		const settings = await this.container.redis.get<DevSettings>(DevSettingsKey);
		if (settings) return settings;

		return {
			feedback: null
		};
	}

	private async saveSettings(settings: DevSettings): Promise<void> {
		await this.container.redis.set(DevSettingsKey, settings);
	}

	private async showSettings(settings: DevSettings, warning?: string[]): Promise<EmbedBuilder> {
		const feedbackCh = settings.feedback ? channelMention(settings.feedback) : 'No channel set';

		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setTitle('Dev Settings')
			.setDescription(`Feedback channel: ${feedbackCh}`);

		if (warning && warning.length > 0) {
			embed.setFields({ name: 'Warnings', value: warning.join('\n') });
		}

		return embed;
	}
}
