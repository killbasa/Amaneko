import { AmanekoCommand } from '../../lib/extensions/AmanekoCommand.js';
import { CustomIDs } from '../../lib/utils/enums.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { BucketScope } from '@sapphire/framework';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Give feedback to the devs to improve the bot!',
	preconditions: ['FeedbackBlacklist'],
	cooldownScope: BucketScope.User,
	cooldownDelay: Time.Minute * 5
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('feedback')
				.setDescription(this.description)
				.setDMPermission(true)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction<'raw'>): Promise<void> {
		const modal = new ModalBuilder({
			custom_id: CustomIDs.Feedback,
			title: 'Amaneko feedback',
			components: [
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('feedback/text')
						.setLabel('What could be changed to improve Amaneko?')
						.setPlaceholder('Type your feedback here...')
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
				)
			]
		});

		await interaction.showModal(modal);
	}
}
