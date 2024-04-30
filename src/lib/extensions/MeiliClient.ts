import { MeiliCategories } from '../types/Meili.js';
import { MeiliSearch } from 'meilisearch';
import type { MeiliClientOptions, MeiliDocument, MeiliIndex } from '../types/Meili.js';
import type { EnqueuedTask, SearchParams, SearchResponse } from 'meilisearch';

export class MeiliClient extends MeiliSearch {
	public constructor(options: MeiliClientOptions) {
		super({
			...options,
			host: `http://${options.host}:${options.port}`
		});
	}

	public async sync(): Promise<void> {
		const indexes = await super.getIndexes();

		for (const index of Object.values(MeiliCategories)) {
			if (!indexes.results.some(({ uid }) => index === uid)) {
				await super.createIndex(index);
			}
		}
	}

	public async get<I extends MeiliIndex>(index: I, searchString: string): Promise<SearchResponse<MeiliDocument<I>, SearchParams>> {
		return await super
			.index(index) //
			.search(searchString, { limit: 25 });
	}

	public async upsertMany<T extends MeiliIndex>(index: T, documents: MeiliDocument<T>[]): Promise<EnqueuedTask> {
		return await super
			.index(index) //
			.addDocuments(documents);
	}
}
