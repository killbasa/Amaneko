import { cleanEmojis } from '#src/lib/utils/youtube';

describe('Comment emoji regex', () => {
	const emoji = ':Zoom:https://yt3.ggpht.com/JUCiu5tPJlIqAmpHbAc6t4Se_OQByUq0K59eCluoYvL3u2ndqWofD2nR0z4XsyHRJc7JCPiIYg=w24-h24-c-k-nd';

	test('single emoji with space', () => {
		const comment = `this is a random comment ${emoji}`;
		const result = cleanEmojis(comment);

		expect(result).toBe('this is a random comment :Zoom:');
	});

	test('double emoji with space', () => {
		const comment = `this is a random comment ${emoji} ${emoji}`;
		const result = cleanEmojis(comment);

		expect(result).toBe('this is a random comment :Zoom: :Zoom:');
	});

	test('double emoji with no space', () => {
		const comment = `this is a random comment${emoji}${emoji}`;
		const result = cleanEmojis(comment);

		expect(result).toBe('this is a random comment:Zoom::Zoom:');
	});
});
