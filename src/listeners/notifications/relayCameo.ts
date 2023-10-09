import { AmanekoEvents } from '#lib/utils/enums';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Listener.Options>({
	name: 'RelayCameo',
	event: AmanekoEvents.StreamComment,
	enabled: false
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.StreamComment> {
	public async run(): Promise<void> {}
}
