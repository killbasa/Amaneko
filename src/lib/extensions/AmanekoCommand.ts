import { Command } from '@sapphire/framework';

export class AmanekoCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, options);
	}
}

export namespace AmanekoCommand {
	export type Options = Command.Options;
	export type Context = Command.LoaderContext;
	export type ChatInputCommandInteraction = Command.ChatInputCommandInteraction<'cached'>;
	export type ContextMenuCommandInteraction = Command.ContextMenuCommandInteraction<'cached'>;
	export type AutocompleteInteraction = Command.AutocompleteInteraction<'cached'>;
	export type Registry = Command.Registry;
}
