import type { Config } from 'meilisearch';

export type MeiliClientOptions = Config & {
	port: number;
};

export const MeiliCategories = {
	HolodexChannels: 'HolodexChannels' as const
};

export type MeiliIndex = (typeof MeiliCategories)[keyof typeof MeiliCategories];

export type MeiliDocument<T extends MeiliIndex> = T extends typeof MeiliCategories.HolodexChannels
	? DocumentHolodexChannel //
	: never;

type DocumentBase = {
	id: string;
};

export type DocumentHolodexChannel = DocumentBase & {
	name: string;
	englishName: string | null;
	org: string | null;
	subOrg: string | null;
	group: string | null;
};
