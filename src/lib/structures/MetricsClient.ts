import { container } from '@sapphire/framework';
import { Counter, Gauge, register } from 'prom-client';
import type { AmanekoCounters } from '#lib/types/Metrics';

export class MetricsClient {
	private readonly counters: AmanekoCounters;

	public constructor() {
		this.setupGauges();
		this.counters = this.setupCounters();
	}

	public incrementCommand(data: { command: string; success: boolean; value?: number }): void {
		const { command, success, value = 1 } = data;
		this.counters.commands.inc({ command, success: String(success) }, value);
	}

	public incrementInteractions(data: { interaction: string; success: boolean; value?: number }): void {
		const { interaction, success, value = 1 } = data;
		this.counters.interactions.inc({ interaction, success: String(success) }, value);
	}

	public incrementStream({ success, value = 1 }: { success: boolean; value?: number }): void {
		this.counters.notifications.stream.inc({ success: String(success) }, value);
	}

	public incrementCommunityPost({ success, value = 1 }: { success: boolean; value?: number }): void {
		this.counters.notifications.community.inc({ success: String(success) }, value);
	}

	public incrementRelay({ success, value = 1 }: { success: boolean; value?: number }): void {
		this.counters.notifications.relay.inc({ success: String(success) }, value);
	}

	public incrementRelayComment(value = 1): void {
		this.counters.tldex.relay.inc(value);
	}

	private setupCounters(): AmanekoCounters {
		return {
			commands: new Counter({
				name: 'amaneko_commands_total',
				help: 'Counter for total amount of command uses.',
				registers: [register],
				labelNames: ['command', 'success'] as const
			}),
			interactions: new Counter({
				name: 'amaneko_interactions_total',
				help: 'Counter for total amount of interactions.',
				registers: [register],
				labelNames: ['interaction', 'success'] as const
			}),
			notifications: {
				stream: new Counter({
					name: 'amaneko_notifications_stream_total',
					help: 'Counter for total amount of stream notifications.',
					registers: [register],
					labelNames: ['success'] as const
				}),
				community: new Counter({
					name: 'amaneko_notifications_community_total',
					help: 'Counter for total amount of community post notifications.',
					registers: [register],
					labelNames: ['success'] as const
				}),
				relay: new Counter({
					name: 'amaneko_notifications_relay_total',
					help: 'Counter for total amount of relay notifications.',
					registers: [register],
					labelNames: ['success'] as const
				})
			},
			tldex: {
				relay: new Counter({
					name: 'amaneko_tldex_relay_total',
					help: 'Counter for total amount of processes tldex comments.',
					registers: [register]
				})
			}
		};
	}

	private setupGauges(): void {
		new Gauge({
			name: 'amaneko_guilds_total',
			help: 'Gauge for total amount of guilds.',
			registers: [register],
			collect(): void {
				if (container.client.isReady()) {
					this.set(container.client.guilds.cache.size);
				}
			}
		});

		new Gauge({
			name: 'amaneko_users_total',
			help: 'Gauge for total amount of users.',
			registers: [register],
			collect(): void {
				if (container.client.isReady()) {
					this.set(container.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0));
				}
			}
		});

		new Gauge({
			name: 'amaneko_subscriptions_total',
			help: 'Gauge for total amount of subscriptions.',
			registers: [register],
			async collect(): Promise<void> {
				if (container.client.isReady()) {
					this.set(await container.prisma.subscription.count());
				}
			}
		});

		new Gauge({
			name: 'amaneko_holodex_channels_total',
			help: 'Gauge for total amount of holodex channels.',
			registers: [register],
			async collect(): Promise<void> {
				if (container.client.isReady()) {
					this.set(await container.prisma.holodexChannel.count());
				}
			}
		});

		new Gauge({
			name: 'amaneko_tldex_rooms_total',
			help: 'Gauge for total amount of tldex rooms.',
			registers: [register],
			collect(): void {
				if (container.client.isReady()) {
					this.set(container.tldex.size);
				}
			}
		});
	}
}
