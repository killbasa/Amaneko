import { AmanekoTask } from '../lib/extensions/AmanekoTask.js';
import { MeiliCategories } from '../lib/types/Meili.js';
import { AmanekoTasks } from '../lib/utils/enums.js';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';
import { ApplyOptions } from '@sapphire/decorators';
import { container } from '@sapphire/framework';
import { Time } from '@sapphire/duration';
import type { HolodexChannel } from '@prisma/client';

@ApplyOptions<ScheduledTask.Options>({
	name: AmanekoTasks.HolodexSync,
	pattern: '0 0 0 * * 6', // Every saturday
	enabled: container.config.enableTasks,
	customJobOptions: {
		jobId: `tasks:${AmanekoTasks.HolodexSync}`
	}
})
export class Task extends AmanekoTask<typeof AmanekoTasks.HolodexSync> {
	public override async run(data?: { page: number }): Promise<void> {
		const { prisma, holodex, meili, logger } = this.container;

		const page = data ? data.page : 0;

		const channels = await holodex.getChannels({
			offset: page * 100
		});

		logger.debug(`[HolodexSync] Synced ${channels.length} channels (pages: ${page + 1})`);

		await meili.upsertMany(
			MeiliCategories.HolodexChannels,
			channels.map(({ id, name, english_name, org, suborg, group }) => {
				const enName =
					english_name && english_name.length > 0 //
						? english_name
						: null;

				return { id, name, englishName: enName, org, subOrg: suborg, group };
			})
		);

		await prisma.$transaction(
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			channels.map((channel) => {
				const enName =
					channel.english_name && channel.english_name.length > 0 //
						? channel.english_name
						: null;

				const data: HolodexChannel = {
					id: channel.id,
					name: channel.name,
					englishName: enName,
					image: channel.photo,
					org: channel.org,
					subOrg: channel.suborg
				};

				container.cache.holodexChannels.set(channel.id, data);

				return prisma.holodexChannel.upsert({
					where: { id: channel.id },
					update: data,
					create: data
				});
			})
		);

		if (channels.length === 100) {
			await this.scheduleNextPage(page + 1);
		} else {
			logger.info(`[HolodexSync] Sync complete. (channels: ${page * 100 + channels.length}, pages: ${page + 1})`, {
				task: this.name
			});
		}
	}

	private async scheduleNextPage(page: number): Promise<void> {
		await this.container.tasks.create(
			{
				name: AmanekoTasks.HolodexSync, //
				payload: { page }
			},
			{ repeated: false, delay: Time.Second * 30 }
		);
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ScheduledTasks {
		[AmanekoTasks.HolodexSync]?: { page: number };
	}
}
