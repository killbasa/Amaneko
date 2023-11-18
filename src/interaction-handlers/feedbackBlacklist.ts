import { CustomIDs } from '#lib/utils/enums';
import { errorReply, successReply } from '#lib/utils/reply';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';

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

		await prisma.feedbackBlacklist.create({
			data: { userId }
		});

		await successReply(interaction, `\`${userId}\` has been blacklisted.`, true);
	}

	public override async parse(interaction: ButtonInteraction) {
		if (interaction.customId !== CustomIDs.FeedbackBlacklist) return this.none();

		const userId = interaction.message.embeds.at(0)?.fields.find((field) => field.name === 'User ID')?.value;
		if (!userId) {
			await errorReply(interaction, 'Failed to get user ID from embed.', true);
			return this.none();
		}

		return this.some({
			userId
		});
	}
}
