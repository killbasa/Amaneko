import { Subcommand } from '@sapphire/plugin-subcommands';

export class AmanekoSubcommand extends Subcommand {
	public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
		super(context, options);
	}
}

export namespace AmanekoSubcommand {
	export type Options = Subcommand.Options;
	export type Context = Subcommand.LoaderContext;
	export type ChatInputCommandInteraction = Subcommand.ChatInputCommandInteraction<'cached'>;
	export type ContextMenuCommandInteraction = Subcommand.ContextMenuCommandInteraction<'cached'>;
	export type AutocompleteInteraction = Subcommand.AutocompleteInteraction<'cached'>;
	export type Registry = Subcommand.Registry;
}
