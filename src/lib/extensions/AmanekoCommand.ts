import { Command } from '@sapphire/framework';
import type { CacheType } from 'discord.js';

export class AmanekoCommand extends Command {
	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, options);
	}
}

export namespace AmanekoCommand {
	export type Options = Command.Options;
	export type LoaderContext = Command.LoaderContext;
	export type ChatInputCommandInteraction<Cached extends CacheType = 'cached'> = Command.ChatInputCommandInteraction<Cached>;
	export type ContextMenuCommandInteraction<Cached extends CacheType = 'cached'> = Command.ContextMenuCommandInteraction<Cached>;
	export type AutocompleteInteraction<Cached extends CacheType = 'cached'> = Command.AutocompleteInteraction<Cached>;
	export type Registry = Command.Registry;
}
