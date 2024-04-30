import { AmanekoError } from '../../lib/structures/AmanekoError.js';
import { errorReply } from '../../lib/utils/reply.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, container } from '@sapphire/framework';
import { SubcommandPluginEvents } from '@sapphire/plugin-subcommands';
import type { ChatInputCommandErrorPayload, ContextMenuCommandErrorPayload } from '@sapphire/framework';
import type { ChatInputSubcommandErrorPayload } from '@sapphire/plugin-subcommands';

async function handleError(data: {
	message: string;
	error: Error;
	payload: ChatInputCommandErrorPayload | ChatInputSubcommandErrorPayload | ContextMenuCommandErrorPayload;
}): Promise<void> {
	const { error, message, payload } = data;
	const { command, interaction } = payload;

	if (error instanceof AmanekoError) {
		await errorReply(interaction, error.message);
		return;
	}

	container.metrics.counters.incCommand({
		command: command.name,
		success: false
	});
	container.logger.error(message, error, {
		command
	});

	await errorReply(interaction, 'Something went wrong when handling your request.', true);
}

@ApplyOptions<Listener.Options>({
	name: Events.ChatInputCommandError,
	event: Events.ChatInputCommandError
})
export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public async run(error: Error, payload: ChatInputCommandErrorPayload): Promise<void> {
		const { command } = payload;
		const { name, location } = command;

		await handleError({
			message: `Encountered error on chat input command "${name}" at path "${location.full}"`,
			error,
			payload
		});
	}
}

@ApplyOptions<Listener.Options>({
	name: Events.ContextMenuCommandError,
	event: Events.ContextMenuCommandError
})
export class ContextMenuCommandError extends Listener<typeof Events.ContextMenuCommandError> {
	public async run(error: Error, payload: ContextMenuCommandErrorPayload): Promise<void> {
		const { command } = payload;
		const { name, location } = command;

		await handleError({
			message: `Encountered error on context-menu command "${name}" at path "${location.full}"`,
			error,
			payload
		});
	}
}

@ApplyOptions<Listener.Options>({
	name: SubcommandPluginEvents.ChatInputSubcommandError,
	event: SubcommandPluginEvents.ChatInputSubcommandError
})
export class ChatInputSubcommandError extends Listener<typeof SubcommandPluginEvents.ChatInputSubcommandError> {
	public async run(error: Error, payload: ChatInputSubcommandErrorPayload): Promise<void> {
		const { command } = payload;
		const { name, location } = command;

		await handleError({
			message: `Encountered error on chat input subcommand "${name}" at path "${location.full}"`,
			error,
			payload
		});
	}
}
