import { Time } from '@sapphire/duration';
import { calculateTimestamp } from '#src/lib/utils/functions';

describe('calculateTimestamp', () => {
	const now = Date.now();
	const startTime = new Date(now).toISOString();

	test('10 minutes before', () => {
		const log = new Date(now).valueOf() - Time.Minute * 10;

		const result = calculateTimestamp(startTime, log);
		expect(result).toBe('-00:10:00');
	});

	test('1 hour before', () => {
		const log = new Date(now).valueOf() - Time.Hour;

		const result = calculateTimestamp(startTime, log);
		expect(result).toBe('-01:00:00');
	});

	test('at', () => {
		const log = new Date(now).valueOf();

		const result = calculateTimestamp(startTime, log);
		expect(result).toBe('00:00:00');
	});

	test('10 minutes after', () => {
		const log = new Date(now).valueOf() + Time.Minute * 10;

		const result = calculateTimestamp(startTime, log);
		expect(result).toBe('00:10:00');
	});

	test('1 hour after', () => {
		const log = new Date(now).valueOf() + Time.Hour;

		const result = calculateTimestamp(startTime, log);
		expect(result).toBe('01:00:00');
	});
});
