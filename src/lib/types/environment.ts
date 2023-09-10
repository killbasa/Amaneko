declare global {
	namespace NodeJS {
		export interface ProcessEnv {
			NODE_ENV: 'dev' | 'production' | 'staging' | 'test' | undefined;
			DISCORD_TOKEN: string | undefined;
			DISCORD_ID: string | undefined;
			HOLODEX_API_KEY: string | undefined;
			DATABASE_URL: string | undefined;
			REDIS_HOST: string | undefined;
			REDIS_PORT: string | undefined;
			REDIS_PASSWORD: string | undefined;
			YOUTUBE_API_KEY: string | undefined;
			DISCORD_DEVSERVER: string | undefined;
			DISCORD_OWNERIDS: string | undefined;
			MEILI_HOST: string | undefined;
			MEILI_PORT: string | undefined;
		}
	}
}

export {};
