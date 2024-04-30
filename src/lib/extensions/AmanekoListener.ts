import { toSnakeCase } from '../utils/functions.js';
import { Listener } from '@sapphire/framework';
import type { ClientEvents } from 'discord.js';
import type { AmanekoTracer } from '../structures/otel/AmanekoTracer.js';

export abstract class AmanekoListener<E extends keyof ClientEvents> extends Listener<E> {
	protected readonly tracer: AmanekoTracer;

	public constructor(context: Listener.LoaderContext, options?: Listener.Options) {
		super(context, options);

		this.tracer = this.container.otel.getTracer(toSnakeCase(context.name));
	}
}
