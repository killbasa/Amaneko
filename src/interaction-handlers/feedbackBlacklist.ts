import { AmanekoEmojis, BrandColors } from '#lib/utils/constants';
import { CustomIDs } from '#lib/utils/enums';
import { errorReply, successReply } from '#lib/utils/reply';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, EmbedBuilder } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	name: CustomIDs.FeedbackBlacklist,
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async run(
		interaction: ButtonInteraction, //
		{ userId }: InteractionHandler.ParseResult<this>
	): Promise<void> {
		const { prisma } = this.container;

		const existing = await prisma.feedbackBlacklist.findUnique({
			where: { userId }
		});
		if (existing) {
			await errorReply(interaction, `\`${userId}\` is already blacklisted.`, true);
			return;
		}

		const embed = EmbedBuilder.from(interaction.message.embeds.at(0)!);
		await interaction.message.edit({
			embeds: [
				embed //
					.setColor(BrandColors.Error)
					.setFooter({ text: `${AmanekoEmojis.RedX} Blacklisted` })
			],
			components: []
		});

		await prisma.feedbackBlacklist.create({
			data: { userId }
		});

		await successReply(interaction, `\`${userId}\` has been blacklisted.`, true);
	}

	public override async parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith(CustomIDs.FeedbackBlacklist)) return this.none();

		const userId = interaction.customId.split(':').at(1);
		if (!userId) {
			await errorReply(interaction, 'Failed to get user ID from message.', true);
			return this.none();
		}

		return this.some({
			userId
		});
	}
}
