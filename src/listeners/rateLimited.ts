import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { RESTEvents } from 'discord.js';
import type { RateLimitData } from 'discord.js';

@ApplyOptions<Listener.Options>({
	emitter: 'rest',
	event: RESTEvents.RateLimited
})
export class ClientListener extends Listener<typeof RESTEvents.RateLimited> {
	public async run(data: RateLimitData): Promise<void> {
		this.container.logger.error(
			'Encountered unexpected 429 rate limit',
			`  Global         : ${data.global}`,
			`  Method         : ${data.method}`,
			`  URL            : ${data.url}`,
			`  Bucket         : ${data.route}`,
			`  Major parameter: ${data.majorParameter}`,
			`  Hash           : ${data.hash}`,
			`  Limit          : ${data.limit}`,
			`  Time to reset  : ${data.timeToReset}ms`
		);
	}
}
