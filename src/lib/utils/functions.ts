import { context, trace } from '@opentelemetry/api';
import type { Primitive } from '@killbasa/redis-utils';

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function arrayIsEqual(arrayOne: Primitive[], arrayTwo: Primitive[]): boolean {
	if (arrayOne === arrayTwo) return true;
	if (arrayOne.length !== arrayTwo.length) return false;

	for (let i = 0; i < arrayOne.length; i++) {
		if (arrayOne.at(i) !== arrayTwo.at(i)) return false;
	}

	return true;
}

export function isPrimitive(value: unknown): value is Primitive {
	if (value === null) return true;

	const type = typeof value;
	if (type === 'bigint' || type === 'symbol') return false;
	return type !== 'object' && type !== 'function';
}

export function getTraceContext(): { traceId: string | undefined; spanId: string | undefined } {
	const data = trace.getSpan(context.active())?.spanContext();
	return {
		traceId: data?.traceId,
		spanId: data?.spanId
	};
}

export function injectTrace(labels: Record<string, number | string>): Record<string, number | string> {
	const { traceId, spanId } = getTraceContext();

	if (traceId) labels.traceid = traceId;
	if (spanId) labels.spanid = spanId;

	return labels;
}

export function calculateTimestamp(start: string, commentTimestamp: number): string {
	const startTime = new Date(Date.parse(start)).valueOf();
	const loggedTime = new Date(commentTimestamp).valueOf();

	if (loggedTime - startTime < 0) {
		return `-${new Date(startTime - loggedTime).toISOString().substring(11, 19)}`;
	}
	return new Date(loggedTime - startTime).toISOString().substring(11, 19);
}
