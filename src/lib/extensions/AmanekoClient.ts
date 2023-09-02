import { RedisClient } from '@killbasa/redis-utils';
import { PrismaClient } from '@prisma/client';
import { SapphireClient, container } from '@sapphire/framework';
import { IntentsBitField } from 'discord.js';

export class AmanekoClient extends SapphireClient {
	public constructor() {
		const { config } = container;

		super({
			intents: [IntentsBitField.Flags.Guilds],
			loadSubcommandErrorListeners: false,
			tasks: {
				bull: {
					connection: {
						host: config.redis.host,
						port: config.redis.port,
						password: config.redis.password
					},
					defaultJobOptions: { removeOnComplete: 0, removeOnFail: 0 }
				}
			}
		});

		container.prisma = new PrismaClient({
			datasources: { database: { url: config.database.url } }
		});
		container.redis = new RedisClient(config.redis);
	}

	public override async login(token: string): Promise<string> {
		return super.login(token);
	}

	public override async destroy(): Promise<void> {
		return super.destroy();
	}
}
