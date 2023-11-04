import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { RESTEvents } from 'discord.js';
import type { APIRequest } from 'discord.js';

@ApplyOptions<Listener.Options>({
	emitter: 'rest',
	event: RESTEvents.Response
})
export class ClientListener extends Listener<typeof RESTEvents.Response> {
	public async run(response: APIRequest): Promise<void> {
		// Interaction endpoints are ignored by rate limits
		if (response.route.startsWith('/interactions')) return;

		this.container.metrics.counters.incRequests();
	}
}
