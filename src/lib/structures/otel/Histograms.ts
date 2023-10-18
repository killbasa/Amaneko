import { injectTrace } from '#lib/utils/functions';
import type { Histogram, Meter } from '@opentelemetry/api';

export class Histograms {
	public readonly stream: Histogram;
	public readonly relay: Histogram;

	public constructor(meter: Meter) {
		this.stream = meter.createHistogram('amaneko_stream_duration_milliseconds', {
			description: 'Duration of stream processing in milliseconds.'
		});

		this.relay = meter.createHistogram('amaneko_relay_duration_milliseconds', {
			description: 'Duration of relay processing in milliseconds.'
		});
	}

	public observeStream(): { end: (labels: { streams: number }) => void } {
		const now = performance.now();
		return {
			end: (labels): void => {
				this.stream.record(performance.now() - now, injectTrace(labels));
			}
		};
	}

	public observeRelay(): { end: (labels: { subscriptions: number }) => void } {
		const now = performance.now();
		return {
			end: (labels): void => {
				this.relay.record(performance.now() - now, injectTrace(labels));
			}
		};
	}
}
