import type { Tracer } from '@opentelemetry/api';
import type { Awaitable } from '@sapphire/framework';

export class AmanekoTracer {
	public constructor(private readonly tracer: Tracer) {}

	public createSpan<T>(name: string, callback: () => Awaitable<T>): Awaitable<T> {
		return this.tracer.startActiveSpan(name, async (span) => {
			const result = await callback();
			span.end();
			return result;
		});
	}
}
