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
	CommunityPost: 'CommunityPostTask',
	HolodexSync: 'HolodexSyncTask',
	Streams: 'StreamsTask',
	SubscribedStreams: 'SubscribedStreamsTask',
	UpdateActivity: 'UpdateActivityTask'
} as const;
export type AmanekoTasks = (typeof AmanekoTasks)[keyof typeof AmanekoTasks];

export const CustomIDs = {
	Feedback: 'amaneko/feedback',
	FeedbackBlacklist: 'amaneko/feedback-blacklist'
} as const;
