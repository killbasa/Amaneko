import { AmanekoLogger } from '#src/lib/extensions/AmanekoLogger';

describe('isRecord', () => {
	const TestClass = class Test {
		public key = 'value';
	};

	test('string', () => {
		const result = AmanekoLogger.isRecord('string');
		expect(result).toBe(false);
	});

	test('number', () => {
		const result = AmanekoLogger.isRecord(10);
		expect(result).toBe(false);
	});

	test('bigint', () => {
		const result = AmanekoLogger.isRecord(BigInt(10));
		expect(result).toBe(false);
	});

	test('boolean', () => {
		const result = AmanekoLogger.isRecord(true);
		expect(result).toBe(false);
	});

	test('undefined', () => {
		const result = AmanekoLogger.isRecord(undefined);
		expect(result).toBe(false);
	});

	test('null', () => {
		const result = AmanekoLogger.isRecord(null);
		expect(result).toBe(false);
	});

	test('symbol', () => {
		const result = AmanekoLogger.isRecord(Symbol('value'));
		expect(result).toBe(false);
	});

	test('object', () => {
		const result = AmanekoLogger.isRecord({
			string: 'value',
			number: 10,
			bool: true,
			undef: undefined,
			null: null,
			object: { key: 'value' },
			array: []
		});
		expect(result).toBe(true);
	});

	test('array', () => {
		const result = AmanekoLogger.isRecord([]);
		expect(result).toBe(false);
	});

	test('function', () => {
		const value = function (): boolean {
			return true;
		};

		const result = AmanekoLogger.isRecord(value);
		expect(result).toBe(false);
	});

	test('arrow function', () => {
		const value = (): boolean => {
			return true;
		};

		const result = AmanekoLogger.isRecord(value);
		expect(result).toBe(false);
	});

	test('class', () => {
		const result = AmanekoLogger.isRecord(TestClass);
		expect(result).toBe(false);
	});

	test('class instance', () => {
		const result = AmanekoLogger.isRecord(new TestClass());
		expect(result).toBe(true);
	});

	test('error', () => {
		const result = AmanekoLogger.isRecord(Error);
		expect(result).toBe(false);
	});

	test('error instance', () => {
		const result = AmanekoLogger.isRecord(new Error('message'));
		expect(result).toBe(false);
	});
});
