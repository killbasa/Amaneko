import { AmanekoTask } from '#lib/extensions/AmanekoTask';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { ActivityType } from 'discord.js';

@ApplyOptions<ScheduledTask.Options>({
	name: 'UpdateActivity',
	pattern: '0 */15 * * * *', // Every 15 minutes
	enabled: container.config.enableTasks
})
export class Task extends AmanekoTask {
	public override async run(): Promise<void> {
		const { client, tldex } = this.container;

		client.user?.setActivity({
			type: ActivityType.Watching,
			name: `${tldex.size} VTubers`
		});
	}
}
