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
			const comment = getComment({
				message: 'random stuff',
				verified: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(true);
		});

		test('verified, vtuber', async () => {
			const comment = getComment({
				message: 'random stuff',
				verified: true,
				vtuber: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(false);
		});

		test('verified, translation', async () => {
			const comment = getComment({
				message: 'random stuff',
				verified: true,
				tl: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(false);
		});

		test('verified, moderator', async () => {
			const comment = getComment({
				message: 'random stuff',
				verified: true,
				mod: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(false);
		});
	});

	describe('check super chat', () => {
		it('should not filter a random message', async () => {
			const comment = getComment({
				message: 'random stuff',
				verified: true,
				mod: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(false);
		});

		it('should not filter a random message from owner', async () => {
			const comment = getComment({
				channeId: '2',
				message: 'random stuff',
				verified: true,
				mod: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(false);
		});

		it('should filter for same ID', async () => {
			const comment = getComment({
				channeId: '2',
				message: 'hearted a Super Chat from',
				verified: true,
				vtuber: true
			});
			const result = shouldFilterComment(comment, video);

			expect(result).toBe(true);
		});
	});
});
