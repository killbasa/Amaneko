import { Counters } from '#lib/structures/otel/Counters';
import { Histograms } from '#lib/structures/otel/Histograms';
import { metrics } from '@opentelemetry/api';
import { container } from '@sapphire/framework';

export class MetricsClient {
	public readonly counters: Counters;
	public readonly histograms: Histograms;

	public constructor() {
		this.setupGauges();

		this.counters = new Counters();
		this.histograms = new Histograms();
	}

	private setupGauges(): void {
		const meter = metrics.getMeter('gauges');

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
