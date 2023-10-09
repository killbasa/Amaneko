import { isPrimitive } from '#src/lib/utils/functions';

describe('isPrimitive', () => {
	const TestClass = class Test {
		public key = 'value';
	};

	test('string', () => {
		const result = isPrimitive('string');
		expect(result).toBe(true);
	});

	test('number', () => {
		const result = isPrimitive(10);
		expect(result).toBe(true);
	});

	test('bigint', () => {
		const result = isPrimitive(BigInt(10));
		expect(result).toBe(false);
	});

	test('boolean', () => {
		const result = isPrimitive(true);
		expect(result).toBe(true);
	});

	test('undefined', () => {
		const result = isPrimitive(undefined);
		expect(result).toBe(true);
	});

	test('null', () => {
		const result = isPrimitive(null);
		expect(result).toBe(true);
	});

	test('symbol', () => {
		const result = isPrimitive(Symbol('value'));
		expect(result).toBe(false);
	});

	test('object', () => {
		const result = isPrimitive({
			string: 'value',
			number: 10,
			bool: true,
			undef: undefined,
			null: null,
			object: { key: 'value' },
			array: []
		});
		expect(result).toBe(false);
	});

	test('array', () => {
		const result = isPrimitive([]);
		expect(result).toBe(false);
	});

	test('function', () => {
		const value = function (): boolean {
			return true;
		};

		const result = isPrimitive(value);
		expect(result).toBe(false);
	});

	test('arrow function', () => {
		const value = (): boolean => {
			return true;
		};

		const result = isPrimitive(value);
		expect(result).toBe(false);
	});

	test('class', () => {
		const result = isPrimitive(TestClass);
		expect(result).toBe(false);
	});

	test('class instance', () => {
		const result = isPrimitive(new TestClass());
		expect(result).toBe(false);
	});

	test('error', () => {
		const result = isPrimitive(Error);
		expect(result).toBe(false);
	});

	test('error instance', () => {
		const result = isPrimitive(new Error('message'));
		expect(result).toBe(false);
	});
});
