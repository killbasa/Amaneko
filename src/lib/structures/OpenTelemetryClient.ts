import { AmanekoTracer } from '#lib/structures/otel/AmanekoTracer';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

export class OpenTelemetryClient {
	private readonly client: NodeSDK;

	public constructor(options: { traces: { url: string }; metrics: { port: number; enpoint: string } }) {
		const { metrics, traces } = options;

		this.client = new NodeSDK({
			resource: new Resource({
				[SemanticResourceAttributes.SERVICE_NAME]: 'amaneko'
			}),
			metricReader: new PrometheusExporter({
				port: metrics.port
			}),
			spanProcessor: new BatchSpanProcessor(
				new OTLPTraceExporter({
					url: traces.url
				})
			),
			instrumentations: []
		});
	}

	public start(): void {
		this.client.start();
	}

	public async destroy(): Promise<void> {
		await this.client.shutdown();
	}

	public getTracer(name: string): AmanekoTracer {
		return new AmanekoTracer(trace.getTracer(name));
	}
}
