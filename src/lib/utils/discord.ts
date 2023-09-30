import { BrandColors } from '#lib/utils/constants';
import { EmbedBuilder } from 'discord.js';
import { container } from '@sapphire/framework';
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
	tryEphemeral?: boolean
): Promise<InteractionResponse | Message> {
	const data = formatResponse(interaction, color, text, tryEphemeral);
	return interaction.deferred || interaction.replied //
		? interaction.editReply(data)
		: interaction.reply(data);
}

export async function defaultReply(
	interaction: InteractionUnion,
	text: string,
	options?: { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Default, text, options?.tryEphemeral);
}

export async function successReply(
	interaction: InteractionUnion,
	text: string,
	options?: { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Success, text, options?.tryEphemeral);
}

export async function errorReply(
	interaction: InteractionUnion,
	text: string,
	options?: { tryEphemeral?: boolean }
): Promise<InteractionResponse | Message> {
	return safeReply(interaction, BrandColors.Error, text, options?.tryEphemeral);
}

export async function permissionsCheck(channelId: string, interaction?: InteractionUnion): Promise<boolean | undefined> {
	const discordChannel = interaction?.channel ?? (await container.client.channels.fetch(channelId));
	if (!discordChannel?.isTextBased() || discordChannel.isDMBased()) {
		return false;
	}

	if (interaction?.guild) {
		return (
			interaction.guild.members.me!.permissions.has(['EmbedLinks', 'SendMessages']) ||
			!interaction.guild.members.me!.permissionsIn(discordChannel).has(['EmbedLinks', 'SendMessages'])
		);
	}

	const { guild } = discordChannel;

	return (
		guild.members.me!.permissions.has(['EmbedLinks', 'SendMessages']) ||
		guild.members.me!.permissionsIn(discordChannel).has(['EmbedLinks', 'SendMessages'])
	);
}
