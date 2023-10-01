export type Unvalidated<T> = {
	[P in keyof T]: T[P] extends object ? Unvalidated<T[P]> : T[P] | undefined;
};

export type Nullish<T> = {
	[P in keyof T]?: T[P] | null;
};
