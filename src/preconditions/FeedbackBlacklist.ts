import { ApplyOptions } from '@sapphire/decorators';
import { Precondition } from '@sapphire/framework';
import type { AsyncPreconditionResult, PreconditionOptions } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

@ApplyOptions<PreconditionOptions>({
	name: 'FeedbackBlacklist'
})
export class AmanekoPrecondition extends Precondition {
	public override async chatInputRun(interaction: CommandInteraction): AsyncPreconditionResult {
		return await this.isBlacklisted(interaction.user.id);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction): AsyncPreconditionResult {
		return await this.isBlacklisted(interaction.user.id);
	}

	public override async messageRun(message: Message): AsyncPreconditionResult {
		return await this.isBlacklisted(message.author.id);
	}

	private async isBlacklisted(userId: string): AsyncPreconditionResult {
		const result = await this.container.prisma.feedbackBlacklist.count({
			where: { userId }
		});

		if (result > 0) {
			return await this.error({
				message: [
					'You have been blacklisted from giving feedback.', //
					'If you believe this is a mistake, please join the support server.'
				].join('\n')
			});
		}

		return await this.ok();
	}
}

declare module '@sapphire/framework' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Preconditions {
		FeedbackBlacklist: never;
	}
}
