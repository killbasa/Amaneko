import { injectTrace, isPrimitive } from '#lib/utils/functions';
import { Logger } from '@sapphire/plugin-logger';
import { LogLevel } from '@sapphire/framework';
import { inspect } from 'util';
import type { ILogger } from '@sapphire/framework';
import type { LoggerOptions } from '@sapphire/plugin-logger';
import type { Primitive } from '@killbasa/redis-utils';

export class AmanekoLogger extends Logger implements ILogger {
	private readonly labels: Record<string, Primitive>;
	private readonly json: boolean;

	public constructor(options?: LoggerOptions) {
		super(options);

		this.labels = options?.labels ?? {};
		this.json = options?.json ?? false;
	}

	public setLevel(level: LogLevel): void {
		this.level = level;
	}

	public override write(level: LogLevel, ...values: readonly unknown[]): void {
		if (!this.json) {
			super.write(level, ...values);
			return;
		} else if (!this.has(level)) {
			return;
		}

		const date = new Date();
		const method = Logger.levels.get(level) ?? 'log';
		const lines: string[] = [];
		const labels: Record<string, Primitive> = {};

		for (const entry of values) {
			if (AmanekoLogger.isRecord(entry)) {
				for (const [key, val] of Object.entries(entry)) {
					if (isPrimitive(val)) labels[key] = val;
				}
			} else {
				lines.push(typeof entry === 'string' ? entry : inspect(entry, { depth: 0 }));
			}
		}

		const log: Record<string, Primitive> = Object.assign(
			labels,
			this.labels,
			injectTrace({
				message: lines.join(this.join),
				level: method,
				timestamp: date.toISOString(),
				ts: date.valueOf()
			})
		);

		this.console[method](JSON.stringify(log));
	}

	// This is static because having it as an instance method messes with the `instanceof Error` check.
	public static isRecord(value: unknown): value is Record<string, unknown> {
		if (value instanceof Error) return false;
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}
}
