import { toSnakeCase } from '../utils/functions.js';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import type { AmanekoTracer } from '../structures/otel/AmanekoTracer.js';
import type { AmanekoTasks } from '../utils/enums.js';

export abstract class AmanekoTask<T extends AmanekoTasks = AmanekoTasks> extends ScheduledTask<T> {
	protected readonly tracer: AmanekoTracer;

	public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
		super(context, options);

		this.tracer = this.container.otel.getTracer(toSnakeCase(context.name));
	}
}
