import { client } from '../mocks/prisma';
import { getComment } from '../mocks/tldex';
import type { DeepPartial } from '#src/lib/types/Generic';
import type { Holodex } from '#src/lib/types/Holodex';
import type { Subscription } from '@prisma/client';
import { resolveRelayQuery } from '#src/lib/utils/notifications';

describe('resolveRelayQuery', () => {
	const video: DeepPartial<Holodex.VideoWithChannel> = {
		channel: { id: '1' }
	};

	/**
	 * Checks if the result of the query matches the expected IDs
	 * @param subscriptions - Subscriptions returned from the query
	 * @param valid - IDs of subscriptions that should be returned
	 *
	 * @remarks The valid IDs can be found in the seed function of tests/mocks/prisma.ts
	 */
	function parseResult(subscriptions: Subscription[], valid: string[]): boolean {
		if (subscriptions.length !== valid.length) return false;

		const ids = subscriptions.map((sub) => sub.id);
		return valid.every((id) => ids.includes(id));
	}

	test('vtuber', async () => {
		const comment = getComment({
			vtuber: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['1', '2', '3', '4'])).toBe(true);
	});

	test('vtuber, translation', async () => {
		const comment = getComment({
			vtuber: true,
			tl: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['1', '2', '3', '4'])).toBe(true);
	});

	test('vtuber, moderator', async () => {
		const comment = getComment({
			vtuber: true,
			mod: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['1', '2', '3', '4'])).toBe(true);
	});

	test('translation', async () => {
		const comment = getComment({
			tl: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['2', '4'])).toBe(true);
	});

	test('translation, moderator', async () => {
		const comment = getComment({
			tl: true,
			mod: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['4'])).toBe(true);
	});

	test('moderator', async () => {
		const comment = getComment({
			mod: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['3', '4'])).toBe(true);
	});

	test('vtuber, translation, moderator', async () => {
		const comment = getComment({
			vtuber: true,
			tl: true,
			mod: true
		});

		const result = await client.subscription.findMany({
			where: resolveRelayQuery(comment, video)
		});

		expect(parseResult(result, ['1', '2', '3', '4'])).toBe(true);
	});
});
