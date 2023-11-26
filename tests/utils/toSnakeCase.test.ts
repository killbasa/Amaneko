import { toSnakeCase } from '#src/lib/utils/functions';

describe('toSnakeCase', () => {
	test('camelCase', () => {
		const result = toSnakeCase('helloWorld');

		expect(result).toBe('hello_world');
	});

	test('PascalCase', () => {
		const result = toSnakeCase('HelloWorld');

		expect(result).toBe('hello_world');
	});

	test('snake_case', () => {
		const result = toSnakeCase('hello_world');

		expect(result).toBe('hello_world');
	});

	test('idk', () => {
		const result = toSnakeCase('POaofoaFBaIPOUFbAPIFBifbiubfpiBfpibfpI');

		expect(result).toBe('p_oaofoa_f_ba_i_p_o_u_fb_a_p_i_f_bifbiubfpi_bfpibfp_i');
	});
});
