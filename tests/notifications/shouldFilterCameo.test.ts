import { getComment } from '../mocks/tldex';
import type { DeepPartial } from '#src/lib/types/Generic';
import type { Holodex } from '#src/lib/types/Holodex';
import { shouldFilterCameo } from '#src/lib/utils/notifications';

describe('shouldFilterCameo', () => {
	const video: DeepPartial<Holodex.VideoWithChannel> = {
		channel: { id: '2' }
	};

	describe('filter', () => {
		test('no channel id', async () => {
			const comment = getComment({
				channeId: false
			});
			const result = shouldFilterCameo(comment, video);

			expect(result).toBe(true);
		});

		test('not a vtuber', async () => {
			const comment = getComment({
				vtuber: false
			});
			const result = shouldFilterCameo(comment, video);

			expect(result).toBe(true);
		});

		test('same ID', async () => {
			const comment = getComment({
				channeId: '2',
				vtuber: true
			});
			const result = shouldFilterCameo(comment, video);

			expect(result).toBe(true);
		});
	});

	describe('no filter', () => {
		test('vtuber', async () => {
			const comment = getComment({
				vtuber: true
			});
			const result = shouldFilterCameo(comment, video);

			expect(result).toBe(false);
		});
	});
});
