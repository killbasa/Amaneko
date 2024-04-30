import { toSnakeCase } from '../utils/functions.js';
import { Listener, Piece, Result } from '@sapphire/framework';
import { AsyncQueue } from '@sapphire/async-queue';
import { Option } from '@sapphire/result';
import type { Awaitable } from '@sapphire/framework';
import type { AmanekoTracer } from '../structures/otel/AmanekoTracer.js';
import type { Holodex } from '../types/Holodex.js';
import type { TLDex } from '../types/TLDex.js';
import type { CommunityPostData } from '../types/YouTube.js';
import type { AmanekoEvents } from '../utils/enums.js';

export abstract class AmanekoNotifier<E extends keyof AmanekoNotifications> extends Listener {
	protected readonly tracer: AmanekoTracer;
	private readonly queue: AsyncQueue;

	public constructor(context: Listener.LoaderContext, options: AmanekoNotifier.Options) {
		super(context, options);

		this.tracer = this.container.otel.getTracer(toSnakeCase(context.name));
		this.queue = new AsyncQueue();
	}

	public async run(...args: AmanekoNotifierPayload<E>): Promise<void> {
		const data = await this.tracer.createSpan('process', async () => {
			return await this.process(...args);
		});
		if (data.isNone()) return;

		await this.queue.wait();
		const result = await this.tracer.createSpan('send', async () => {
			return await Result.fromAsync(async () => this.send(data.unwrap()));
		});

		result.inspectErr((error) => {
			this.container.logger.error(
				`Encountered error on notifier "${this.name}" at path "${this.location.full}"`, //
				error
			);
		});

		this.queue.shift();
	}

	public abstract process(...args: AmanekoNotifierPayload<E>): Awaitable<Option<unknown>>;

	public abstract send(data: unknown): unknown;

	public some<T>(data: T): Option.Some<T> {
		return Option.some(data);
	}

	public none(): Option.None {
		return Option.none;
	}
}

export type AmanekoNotifierPayload<E extends keyof AmanekoNotifications> = AmanekoNotifications[E];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AmanekoNotifierOptions extends Listener.Options {
	event: (typeof AmanekoEvents)[keyof typeof AmanekoEvents];
}

export type AmanekoNotifications = {
	[AmanekoEvents.CommunityPost]: [post: CommunityPostData];
	[AmanekoEvents.StreamPrechat]: [video: Holodex.VideoWithChannel];
	[AmanekoEvents.StreamStart]: [video: Holodex.VideoWithChannel];
	[AmanekoEvents.StreamEnd]: [video: Holodex.VideoWithChannel];
	[AmanekoEvents.StreamComment]: [message: TLDex.CommentPayload, video: Holodex.VideoWithChannel];
};

export namespace AmanekoNotifier {
	export type Options = AmanekoNotifierOptions;
	export type LoaderContext = Piece.LoaderContext;
	export type ProcessResult<Instance extends AmanekoNotifier<keyof AmanekoNotifications>> = Option.UnwrapSome<
		Awaited<ReturnType<Instance['process']>>
	>;
}
