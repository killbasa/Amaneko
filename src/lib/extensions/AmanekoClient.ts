import { HolodexClient } from '#lib/structures/HolodexClient';
import { MeiliClient } from '#lib/extensions/MeiliClient';
import { TLDexClient } from '#lib/structures/TLDexClient';
import { MetricsClient } from '#lib/structures/MetricsClient';
import { OpenTelemetryClient } from '#lib/structures/OpenTelemetryClient';
import { AmanekoLogger } from '#lib/extensions/AmanekoLogger';
import { mainFolder } from '#lib/utils/constants';
import { RedisClient } from '@killbasa/redis-utils';
import { PrismaClient } from '@prisma/client';
import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { Collection, IntentsBitField } from 'discord.js';
import { google } from 'googleapis';
import { resolve } from 'node:path';

export class AmanekoClient extends SapphireClient {
	public constructor() {
		const { config } = container;

		super({
			intents: [IntentsBitField.Flags.Guilds],
			disableMentionPrefix: true,
			loadSubcommandErrorListeners: false,
			loadScheduledTaskErrorListeners: true,
			allowedMentions: {},
			logger: {
				instance: new AmanekoLogger({
					level: config.isDev ? LogLevel.Debug : LogLevel.Info,
					json: !config.isDev,
					labels: {
						app: 'Amaneko'
					}
				})
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

		this.registerStores();

		container.youtube = google.youtube({ version: 'v3', auth: container.config.youtube.apikey });
		container.holodex = new HolodexClient(config.holodex);
		container.tldex = new TLDexClient();

		container.prisma = new PrismaClient({
			datasources: { database: { url: config.database.url } }
		});
		container.redis = new RedisClient(config.redis);
		container.meili = new MeiliClient(config.meili);

		container.otel = new OpenTelemetryClient({
			url: `http://${config.o11y.otel.endpoint}`,
			env: config.env
		});
		container.metrics = new MetricsClient({
			port: config.o11y.metrics.port,
			enpoint: '/metrics',
			env: config.env
		});
	}

	public override async login(token: string): Promise<string> {
		container.otel.start();
		await container.metrics.start();

		await container.meili.sync();
		container.tldex.connect();

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
			container.tldex.destroy(),
			container.otel.destroy(),
			container.metrics.destroy()
		]);

		return super.destroy();
	}

	private registerStores(): void {
		container.stores.get('listeners').registerPath(resolve(mainFolder, 'notifiers'));
	}
}
