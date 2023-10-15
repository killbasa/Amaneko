export const NodeEnv = {
	Dev: 'dev',
	Production: 'production',
	Staging: 'staging',
	Test: 'test'
} as const;
export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

export const AmanekoEvents = {
	CommunityPost: 'CommunityPost',
	StreamPrechat: 'StreamPrechat',
	StreamStart: 'StreamStart',
	StreamEnd: 'StreamEnd',
	StreamComment: 'StreamComment'
} as const;

export const AmanekoTasks = {
	HolodexSync: 'HolodexSync'
} as const;
