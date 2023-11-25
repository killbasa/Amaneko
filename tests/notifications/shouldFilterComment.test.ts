import { getComment } from '../mocks/tldex';
import type { DeepPartial } from '#src/lib/types/Generic';
import type { Holodex } from '#src/lib/types/Holodex';
import { shouldFilterComment } from '#src/lib/utils/notifications';

describe('shouldFilterComment', () => {
	const video: DeepPartial<Holodex.VideoWithChannel> = {
		channel: { id: '2' }
	};

	describe('check verified', () => {
		test('verified', async () => {
			const commnent = getComment({
				message: 'random stuff',
				verified: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(true);
		});

		test('verified, vtuber', async () => {
			const commnent = getComment({
				message: 'random stuff',
				verified: true,
				vtuber: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(false);
		});

		test('verified, translation', async () => {
			const commnent = getComment({
				message: 'random stuff',
				verified: true,
				tl: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(false);
		});

		test('verified, moderator', async () => {
			const commnent = getComment({
				message: 'random stuff',
				verified: true,
				mod: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(false);
		});
	});

	describe('check super chat', () => {
		it('should not filter a random message', async () => {
			const commnent = getComment({
				message: 'random stuff',
				verified: true,
				mod: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(false);
		});

		it('should not filter if not owner', async () => {
			const commnent = getComment({
				message: 'hearted a Super Chat from',
				verified: true,
				vtuber: true,
				owner: false
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(false);
		});

		it('should filter for owner', async () => {
			const commnent = getComment({
				message: 'hearted a Super Chat from',
				verified: true,
				vtuber: true,
				owner: true
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(true);
		});

		it('should filter for same ID', async () => {
			const commnent = getComment({
				channeId: '2',
				message: 'hearted a Super Chat from',
				verified: true,
				vtuber: true,
				owner: false
			});
			const result = shouldFilterComment(commnent, video);

			expect(result).toBe(true);
		});
	});
});
