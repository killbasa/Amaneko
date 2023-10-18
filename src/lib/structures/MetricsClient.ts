import { Counters } from '#lib/structures/otel/Counters';
import { Histograms } from '#lib/structures/otel/Histograms';
import { container } from '@sapphire/framework';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics } from '@opentelemetry/sdk-node';
import type { Meter } from '@opentelemetry/api';

export class MetricsClient {
	public readonly counters: Counters;
	public readonly histograms: Histograms;

	private readonly client: PrometheusExporter;
	private readonly provider: metrics.MeterProvider;

	public constructor(options: { port: number; enpoint: string }) {
		this.client = new PrometheusExporter(
			{
				port: options.port,
				endpoint: options.enpoint,
				preventServerStart: true
			},
			() => {
				container.logger.info(`[Metrics] Metrics server listening on ${options.port}.`);
			}
		);

		this.provider = new metrics.MeterProvider();
		this.provider.addMetricReader(this.client);

		this.setupGauges();
		this.counters = new Counters(this.getMeter());
		this.histograms = new Histograms(this.getMeter());
	}

	public async start(): Promise<void> {
		await this.client.startServer();
	}

	public async destroy(): Promise<void> {
		await this.client.stopServer();
	}

	public getMeter(): Meter {
		return this.provider.getMeter('metrics');
	}

	private setupGauges(): void {
		const meter = this.getMeter();

		meter
			.createObservableGauge('amaneko_guilds_total', {
				description: 'Gauge for total amount of guilds.'
			})
			.addCallback((gauge) => {
				if (container.client.isReady()) {
					gauge.observe(container.client.guilds.cache.size);
				}
			});

		meter
			.createObservableGauge('amaneko_channels_total', {
				description: 'Gauge for total amount of channels.'
			})
			.addCallback((gauge) => {
				if (container.client.isReady()) {
					gauge.observe(container.client.channels.cache.size);
				}
			});

		meter
			.createObservableGauge('amaneko_users_total', {
				description: 'Gauge for total amount of users.'
			})
			.addCallback((gauge) => {
				if (container.client.isReady()) {
					gauge.observe(container.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
				}
			});

		meter
			.createObservableGauge('amaneko_subscriptions_total', {
				description: 'Gauge for total amount of subscriptions.'
			})
			.addCallback(async (gauge) => {
				if (container.client.isReady()) {
					gauge.observe(await container.prisma.subscription.count());
				}
			});

		meter
			.createObservableGauge('amaneko_holodex_channels_total', {
				description: 'Gauge for total amount of holodex channels.'
			})
			.addCallback(async (gauge) => {
				if (container.client.isReady()) {
					gauge.observe(await container.prisma.holodexChannel.count());
				}
			});

		meter
			.createObservableGauge('amaneko_tldex_rooms_total', {
				description: 'Gauge for total amount of tldex rooms.'
			})
			.addCallback((gauge) => {
				if (container.client.isReady()) {
					gauge.observe(container.tldex.size);
				}
			});

		meter
			.createObservableGauge('amaneko_comments_total', {
				description: 'Gauge for total amount of saved comments.'
			})
			.addCallback(async (gauge) => {
				if (container.client.isReady()) {
					gauge.observe(await container.prisma.streamComment.count());
				}
			});
	}
}
