import type { Primitive } from '@killbasa/redis-utils';

export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function arrayIsEqual(arrayOne: Primitive[], arrayTwo: Primitive[]): boolean {
	if (arrayOne === arrayTwo) return true;
	if (arrayOne.length !== arrayTwo.length) return false;

	for (let i = 0; i < arrayOne.length; i++) {
		if (arrayOne.at(i) !== arrayTwo.at(i)) return false;
	}

	return true;
}
