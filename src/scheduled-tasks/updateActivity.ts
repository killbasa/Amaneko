import { AmanekoTask } from '../lib/extensions/AmanekoTask.js';
import { AmanekoTasks } from '../lib/utils/enums.js';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { ActivityType } from 'discord.js';

@ApplyOptions<ScheduledTask.Options>({
	name: AmanekoTasks.UpdateActivity,
	pattern: '0 */15 * * * *', // Every 15 minutes
	enabled: container.config.enableTasks,
	customJobOptions: {
		jobId: `tasks:${AmanekoTasks.UpdateActivity}`
	}
})
export class Task extends AmanekoTask<typeof AmanekoTasks.UpdateActivity> {
	public override async run(): Promise<void> {
		const { client, tldex } = this.container;

		client.user?.setActivity({
			type: ActivityType.Watching,
			name: `${tldex.size} VTubers`
		});
	}
}
declare module '@sapphire/plugin-scheduled-tasks' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ScheduledTasks {
		[AmanekoTasks.UpdateActivity]: undefined;
	}
}
