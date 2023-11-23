import { LogLevel } from '@sapphire/framework';
import { AmanekoLogger } from '#src/lib/extensions/AmanekoLogger';

/**
 * These can be skipped unless you're working on the logger.
 */
describe('AmanekoLogger', () => {
	const logger = new AmanekoLogger({
		level: LogLevel.Trace,
		json: true,
		join: '\n'
	});

	test.skip('logging error', () => {
		logger.info(new Error('test'));

		expect(true).toBe(true);
	});

	test.skip('logging string and error', () => {
		logger.info('Something went wrong', new Error('test'));

		expect(true).toBe(true);
	});

	test.skip('logging metadata', () => {
		logger.info('Hello world', { test: true }, 'Hello again');

		expect(true).toBe(true);
	});
});
