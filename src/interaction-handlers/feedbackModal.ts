import { BrandColors, DevSettingsKey } from '#lib/utils/constants';
import { CustomIDs } from '#lib/utils/enums';
import { canSendGuildEmbeds } from '#lib/utils/permissions';
import { successReply } from '#lib/utils/reply';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalSubmitInteraction, codeBlock } from 'discord.js';
import type { DevSettings } from '#lib/types/Dev';

@ApplyOptions<InteractionHandler.Options>({
	name: CustomIDs.Feedback,
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override async run(
		interaction: ModalSubmitInteraction, //
		{ text }: InteractionHandler.ParseResult<this>
	): Promise<void> {
		const { logger, client, redis } = this.container;

		const settings = await redis.get<DevSettings>(DevSettingsKey);
		if (!settings?.feedback) {
			logger.info(`Feedback: ${text}`);
			return;
		}

		const channel = await client.channels.fetch(settings.feedback);

		if (canSendGuildEmbeds(channel)) {
			await channel.send({
				embeds: [
					new EmbedBuilder() //
						.setColor(BrandColors.Default)
						.setTitle('Feedback')
						.setDescription(codeBlock(text.trim()))
						.setTimestamp()
				],
				components: [
					new ActionRowBuilder<ButtonBuilder>({
						components: [
							new ButtonBuilder({
								customId: `${CustomIDs.FeedbackBlacklist}:${interaction.user.id}`,
								label: 'Blacklist user',
								style: ButtonStyle.Danger
							})
						]
					})
				]
			});
		} else {
			logger.info(`Feedback: ${text}`);
		}

		await successReply(interaction, 'Feedback sent!', true);
	}

	public override async parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId !== CustomIDs.Feedback) return this.none();

		return this.some({
			text: interaction.fields.getTextInputValue('feedback/text')
		});
	}
}
