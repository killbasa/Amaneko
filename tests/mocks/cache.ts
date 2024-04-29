import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const cacheDir = resolve('tests/data');

async function getCache(path: string, ttl?: number): Promise<string | null> {
	path = join(cacheDir, path);

	if (!existsSync(path)) {
		return null;
	}

	const file = await stat(path);
	if (file.isDirectory()) {
		throw new Error('Cache path is a directory');
	}

	if (!file.isFile()) {
		return null;
	}

	if (ttl !== undefined) {
		if (Date.now() - file.mtimeMs > ttl) {
			await rm(path);
			return null;
		}
	}

	return await readFile(path, 'utf-8');
}

async function writeCache(path: string, data: string): Promise<void> {
	path = join(cacheDir, path);

	if (!existsSync(path)) {
		const parent = resolve(path, '..');
		await mkdir(parent, { recursive: true });
	}

	await writeFile(path, data);
}

export async function cache(path: string, ttl: number | undefined, fn: () => Promise<string> | string): Promise<string> {
	const data = await getCache(path, ttl);
	if (data !== null) return data;

	const result = await fn();
	await writeCache(path, result);

	return result;
}
