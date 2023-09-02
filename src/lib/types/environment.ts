declare global {
	namespace NodeJS {
		export interface ProcessEnv {
			NODE_ENV: 'dev' | 'production' | 'test';
			DISCORD_TOKEN: string | undefined,
			DISCORD_ID: string | undefined,
			HOLODEX_API_KEY: string | undefined,
			DATABASE_URL: string | undefined,
			REDIS_HOST: string | undefined,
			REDIS_PORT: string | undefined,
			REDIS_PASSWORD: string | undefined,
		}
	}
}

export {}
