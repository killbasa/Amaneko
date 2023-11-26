import { Subcommand } from '@sapphire/plugin-subcommands';
import type { CacheType } from 'discord.js';

export class AmanekoSubcommand extends Subcommand {
	public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
		super(context, options);
	}
}

export namespace AmanekoSubcommand {
	export type Options = Subcommand.Options;
	export type LoaderContext = Subcommand.LoaderContext;
	export type ChatInputCommandInteraction<Cached extends CacheType = 'cached'> = Subcommand.ChatInputCommandInteraction<Cached>;
	export type ContextMenuCommandInteraction<Cached extends CacheType = 'cached'> = Subcommand.ContextMenuCommandInteraction<Cached>;
	export type AutocompleteInteraction<Cached extends CacheType = 'cached'> = Subcommand.AutocompleteInteraction<Cached>;
	export type Registry = Subcommand.Registry;
}
