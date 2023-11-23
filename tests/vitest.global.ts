import { client, purge, seed } from './mocks/prisma';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.test') });

export async function setup(): Promise<void> {
	await purge();
	await seed();
}

export async function teardown(): Promise<void> {
	await purge();
	await client.$disconnect();
}
