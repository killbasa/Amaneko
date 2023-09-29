import { HolodexClient } from '#lib/structures/HolodexClient';
import { MeiliClient } from '#lib/extensions/MeiliClient';
import { TLDexClient } from '#lib/structures/TLDexClient';
import { MetricsClient } from '#lib/structures/MetricsClient';
import { GuildSettingsCollection } from '#lib/collections/GuildSettingsCollection';
import { RedisClient } from '@killbasa/redis-utils';
import { PrismaClient } from '@prisma/client';
import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { Collection, IntentsBitField } from 'discord.js';

export class AmanekoClient extends SapphireClient {
	public constructor() {
		const { config } = container;

		super({
			intents: [IntentsBitField.Flags.Guilds],
			loadSubcommandErrorListeners: false,
			logger: {
				level: config.isDev ? LogLevel.Debug : LogLevel.Info
			},
			allowedMentions: {},
			api: {
				listenOptions: {
					port: config.api.port
				}
			},
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

		container.holodex = new HolodexClient(config.holodex);
		container.tldex = new TLDexClient();
		container.prisma = new PrismaClient({
			datasources: { database: { url: config.database.url } }
		});
		container.redis = new RedisClient(config.redis);
		container.meili = new MeiliClient(config.meili);
		container.metrics = new MetricsClient();
	}

	public override async login(token: string): Promise<string> {
		await container.meili.sync();
		container.tldex.connect();

		this.settings = new GuildSettingsCollection();

		const channels = await container.prisma.holodexChannel.findMany();
		container.cache = {
			holodexChannels: new Collection(
				channels.map((channel) => {
					return [channel.id, channel];
				})
			)
		};

		return super.login(token);
	}

	public override async destroy(): Promise<void> {
		await Promise.allSettled([
			container.prisma.$disconnect(), //
			container.redis.quit(),
			container.tldex.destroy()
		]);

		return super.destroy();
	}
}
