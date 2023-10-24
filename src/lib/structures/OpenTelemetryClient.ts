import { AmanekoTracer } from '#lib/structures/otel/AmanekoTracer';
import { NodeSDK, api, resources, tracing } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export class OpenTelemetryClient {
	private readonly client: NodeSDK;

	public constructor(options: { url: string }) {
		this.client = new NodeSDK({
			resource: new resources.Resource({
				[SemanticResourceAttributes.SERVICE_NAME]: 'amaneko'
			}),
			spanProcessor: new tracing.BatchSpanProcessor(
				new OTLPTraceExporter({
					url: options.url
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
		return new AmanekoTracer(api.trace.getTracer(name));
	}
}
