import { BrandColors } from '#lib/utils/constants';
import { EmbedBuilder } from 'discord.js';
import type { CommandInteraction, InteractionResponse, Message, MessageComponentInteraction, ModalSubmitInteraction } from 'discord.js';

type InteractionUnion = CommandInteraction | MessageComponentInteraction | ModalSubmitInteraction;

type FormattedResponse = {
	embeds: EmbedBuilder[];
	allowedMentions: {
		users: string[];
		roles: never[];
	};
	ephemeral: boolean | undefined;
};

function formatResponse(interaction: InteractionUnion, color: BrandColors, text: string, tryEphemeral?: boolean): FormattedResponse {
	const embed = new EmbedBuilder().setColor(color).setDescription(text);
	const ephemeral = interaction.ephemeral ?? tryEphemeral;
	return {
		embeds: [embed],
		allowedMentions: { users: [interaction.user.id], roles: [] },
		ephemeral
	};
}

async function safeReply(
	interaction: InteractionUnion,
	color: BrandColors,
	text: string,
	options?: boolean | { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	const ephemeral: boolean =
		typeof options === 'boolean' //
			? options
			: options?.tryEphemeral ?? false;

	const data = formatResponse(interaction, color, text, ephemeral);
	return interaction.deferred || interaction.replied //
		? interaction.editReply(data)
		: interaction.reply(data);
}

export async function defaultReply(
	interaction: InteractionUnion,
	text: string,
	options?: boolean | { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Default, text, options);
}

export async function successReply(
	interaction: InteractionUnion,
	text: string,
	options?: boolean | { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Success, text, options);
}

export async function errorReply(
	interaction: InteractionUnion,
	text: string,
	options?: boolean | { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Error, text, options);
}
