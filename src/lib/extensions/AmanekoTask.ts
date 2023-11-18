import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import type { AmanekoTracer } from '#lib/structures/otel/AmanekoTracer';

export abstract class AmanekoTask extends ScheduledTask {
	protected readonly tracer: AmanekoTracer;

	public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
		super(context, options);

		this.tracer = this.container.otel.getTracer(context.name);
	}
}
