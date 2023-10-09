import { metrics } from '@opentelemetry/api';
import type { Counter } from '@opentelemetry/api';

export class Counters {
	public readonly commands: Counter;
	public readonly interactions: Counter;

	public readonly notifications: {
		stream: Counter;
		community: Counter;
		relay: Counter;
		history: Counter;
	};

	public readonly tldex: {
		relay: Counter;
	};

	public constructor() {
		const meter = metrics.getMeter('histograms');

		this.commands = meter.createCounter('amaneko_commands_total', {
			description: 'Counter for total amount of command uses.'
		});

		this.interactions = meter.createCounter('amaneko_interactions_total', {
			description: 'Counter for total amount of interactions.'
		});

		this.interactions = meter.createCounter('amaneko_interactions_total', {
			description: 'Counter for total amount of interactions.'
		});

		this.notifications = {
			stream: meter.createCounter('amaneko_notifications_stream_total', {
				description: 'Counter for total amount of stream notifications.'
			}),
			community: meter.createCounter('amaneko_notifications_community_total', {
				description: 'Counter for total amount of community post notifications.'
			}),
			relay: meter.createCounter('amaneko_notifications_relay_total', {
				description: 'Counter for total amount of relay notifications.'
			}),
			history: meter.createCounter('amaneko_notifications_history_total', {
				description: 'Counter for total amount of relay history notifications.'
			})
		};

		this.tldex = {
			relay: meter.createCounter('amaneko_tldex_relay_total', {
				description: 'Counter for total amount of processed tldex comments.'
			})
		};
	}

	public incCommand(data: { command: string; success: boolean }): void {
		const { command, success } = data;
		this.commands.add(1, { command, success: String(success) });
	}

	public incInteractions(data: { interaction: string; success: boolean }): void {
		const { interaction, success } = data;
		this.interactions.add(1, { interaction, success: String(success) });
	}

	public incStreamNotif({ success }: { success: boolean }): void {
		this.notifications.stream.add(1, { success: String(success) });
	}

	public incCommunityNotif({ success }: { success: boolean }): void {
		this.notifications.community.add(1, { success: String(success) });
	}

	public incRelayNotif({ success }: { success: boolean }): void {
		this.notifications.relay.add(1, { success: String(success) });
	}

	public incRelayHistoryNotif({ success }: { success: boolean }): void {
		this.notifications.history.add(1, { success: String(success) });
	}

	public incRelayComment(value = 1): void {
		this.tldex.relay.add(value);
	}
}
