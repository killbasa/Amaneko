import { Subcommand } from '@sapphire/plugin-subcommands';

export class AmanekoSubcommand extends Subcommand {
	public constructor(context: Subcommand.Context, options: Subcommand.Options) {
		super(context, options);
	}
}

export namespace AmanekoSubcommand {
	export type Options = Subcommand.Options;
	export type Context = Subcommand.Context;
	export type ChatInputCommandInteraction = Subcommand.ChatInputCommandInteraction<'cached'>;
	export type ContextMenuCommandInteraction = Subcommand.ContextMenuCommandInteraction<'cached'>;
	export type AutocompleteInteraction = Subcommand.AutocompleteInteraction<'cached'>;
	export type Registry = Subcommand.Registry;
}
