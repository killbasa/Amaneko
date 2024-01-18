import { toSnakeCase } from '#lib/utils/functions';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import type { AmanekoTracer } from '#lib/structures/otel/AmanekoTracer';
import type { AmanekoTasks } from '#lib/utils/enums';

export abstract class AmanekoTask<T extends AmanekoTasks = AmanekoTasks> extends ScheduledTask<T> {
	protected readonly tracer: AmanekoTracer;

	public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
		super(context, options);

		this.tracer = this.container.otel.getTracer(toSnakeCase(context.name));
	}
}
