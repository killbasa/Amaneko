import { AmanekoEvents } from '#lib/utils/Events';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Listener.Options>({
	name: 'RelayCameo',
	event: AmanekoEvents.StreamComment,
	enabled: false
})
export class NotificationListener extends Listener<typeof AmanekoEvents.StreamComment> {
	public async run(): Promise<void> {}
}
