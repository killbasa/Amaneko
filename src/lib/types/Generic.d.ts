export type Unvalidated<T> = T extends object
	? {
			[P in keyof T]: T[P] extends object ? Unvalidated<T[P]> : T[P] | undefined;
		}
	: T;

export type Nullish<T> = {
	[P in keyof T]?: T[P] | null;
};

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;
