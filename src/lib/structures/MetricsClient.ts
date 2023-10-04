import { container } from '@sapphire/framework';
import { Counter, Gauge, register } from 'prom-client';
import type { AmanekoCounters } from '#lib/types/Metrics';

export class MetricsClient {
	private readonly counters: AmanekoCounters;

	public constructor() {
		this.setupGauges();
		this.counters = this.setupCounters();
	}

	public incrementCommand(data: { command: string; success: boolean }): void {
		const { command, success } = data;
		this.counters.commands.inc({ command, success: String(success) }, 1);
	}

	public incrementInteractions(data: { interaction: string; success: boolean }): void {
		const { interaction, success } = data;
		this.counters.interactions.inc({ interaction, success: String(success) }, 1);
	}

	public incrementStream({ success }: { success: boolean }): void {
		this.counters.notifications.stream.inc({ success: String(success) }, 1);
	}

	public incrementCommunityPost({ success }: { success: boolean }): void {
		this.counters.notifications.community.inc({ success: String(success) }, 1);
	}

	public incrementRelay({ success }: { success: boolean }): void {
		this.counters.notifications.relay.inc({ success: String(success) }, 1);
	}

	public incrementRelayHistory({ success }: { success: boolean }): void {
		this.counters.notifications.history.inc({ success: String(success) }, 1);
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
				}),
				history: new Counter({
					name: 'amaneko_notifications_history_total',
					help: 'Counter for total amount of relay history notifications.',
					registers: [register],
					labelNames: ['success'] as const
				})
			},
			tldex: {
				relay: new Counter({
					name: 'amaneko_tldex_relay_total',
					help: 'Counter for total amount of processed tldex comments.',
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

		new Gauge({
			name: 'amaneko_comments_total',
			help: 'Gauge for total amount of saved comments.',
			registers: [register],
			async collect(): Promise<void> {
				if (container.client.isReady()) {
					this.set(await container.prisma.streamComment.count());
				}
			}
		});
	}
}
