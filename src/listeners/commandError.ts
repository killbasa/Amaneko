import { AmanekoError } from '#lib/structures/AmanekoError';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { SubcommandPluginEvents } from '@sapphire/plugin-subcommands';
import type { ChatInputCommandErrorPayload, ContextMenuCommandErrorPayload } from '@sapphire/framework';
import type { ChatInputSubcommandErrorPayload } from '@sapphire/plugin-subcommands';
import type { CommandInteraction } from 'discord.js';

async function handleError(error: Error, interaction: CommandInteraction): Promise<void> {
	if (error instanceof AmanekoError) {
		await interaction.editReply(error.message);
	} else {
		await interaction.editReply('Something went wrong when handling your request.');
	}
}

@ApplyOptions<Listener.Options>({
	name: Events.ChatInputCommandError,
	event: Events.ChatInputCommandError
})
export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public async run(error: Error, payload: ChatInputCommandErrorPayload): Promise<void> {
		await handleError(error, payload.interaction);
	}
}

@ApplyOptions<Listener.Options>({
	name: Events.ContextMenuCommandError,
	event: Events.ContextMenuCommandError
})
export class ContextMenuCommandError extends Listener<typeof Events.ContextMenuCommandError> {
	public async run(error: Error, payload: ContextMenuCommandErrorPayload): Promise<void> {
		await handleError(error, payload.interaction);
	}
}

@ApplyOptions<Listener.Options>({
	name: SubcommandPluginEvents.ChatInputSubcommandError,
	event: SubcommandPluginEvents.ChatInputSubcommandError
})
export class ChatInputSubcommandError extends Listener<typeof SubcommandPluginEvents.ChatInputSubcommandError> {
	public async run(error: Error, payload: ChatInputSubcommandErrorPayload): Promise<void> {
		await handleError(error, payload.interaction);
	}
}
