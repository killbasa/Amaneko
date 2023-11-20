import { Counters } from '#lib/structures/otel/Counters';
import { container } from '@sapphire/framework';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { metrics, resources } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { Meter } from '@opentelemetry/api';

export class MetricsClient {
	public readonly counters: Counters;

	private readonly client: PrometheusExporter;
	private readonly provider: metrics.MeterProvider;

	public constructor(options: { port: number; enpoint: string; env: string }) {
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

		this.provider = new metrics.MeterProvider({
			resource: new resources.Resource({
				[SemanticResourceAttributes.SERVICE_NAME]: 'amaneko',
				[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: options.env
			})
		});
		this.provider.addMetricReader(this.client);

		this.setupGauges();
		this.counters = new Counters(this.getMeter());
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
