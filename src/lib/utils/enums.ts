export const NodeEnv = {
	Dev: 'dev',
	Production: 'production',
	Staging: 'staging',
	Test: 'test'
} as const;
export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];
