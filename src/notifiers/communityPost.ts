import { AmanekoEvents } from '../lib/utils/enums.js';
import { AmanekoNotifier } from '../lib/extensions/AmanekoNotifier.js';
import { BrandColors } from '../lib/utils/constants.js';
import { canSendGuildMessages } from '../lib/utils/permissions.js';
import { EmbedBuilder, roleMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import type { CommunityPostData } from '../lib/types/YouTube.js';

@ApplyOptions<AmanekoNotifier.Options>({
	name: AmanekoEvents.CommunityPost,
	event: AmanekoEvents.CommunityPost
})
export class Notifier extends AmanekoNotifier<typeof AmanekoEvents.CommunityPost> {
	public async process(post: CommunityPostData) {
		const { tracer, container } = this;
		const { prisma } = container;

		const subscriptions = await tracer.createSpan('find-subscriptions', async () => {
			return await prisma.subscription.findMany({
				where: { channelId: post.channelId, communityPostChannelId: { not: null } },
				select: { guildId: true, communityPostChannelId: true, communityPostRoleId: true }
			});
		});
		if (subscriptions.length === 0) {
			return this.none();
		}

		return this.some({
			post,
			subscriptions,
			embed: this.buildEmbed(post)
		});
	}

	public async send({ post, subscriptions, embed }: AmanekoNotifier.ProcessResult<this>) {
		const { tracer, container } = this;
		const { redis, client, metrics } = container;

		const messages = await Promise.allSettled([
			subscriptions.map(async ({ guildId, communityPostChannelId, communityPostRoleId }) => {
				return await tracer.createSpan(`process_subscription:${guildId}`, async () => {
					const channel = await client.channels.fetch(communityPostChannelId!);
					if (!canSendGuildMessages(channel)) return;

					const rolePing = communityPostRoleId ? roleMention(communityPostRoleId) : '';

					return await channel.send({
						content: `:loudspeaker: ${rolePing} ${post.channelName} just published a community post!\n${post.url}`,
						embeds: [embed]
					});
				});
			})
		]);

		await redis.hSet('communityposts', post.channelId, post.id);

		for (const entry of messages) {
			metrics.counters.incCommunityNotif({ success: entry.status === 'fulfilled' });
		}
	}

	private buildEmbed(post: CommunityPostData): EmbedBuilder {
		return new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setURL(post.url)
			.setThumbnail(post.avatar)
			.setAuthor({ name: post.channelName, iconURL: post.avatar, url: post.url })
			.setDescription(post.content);
	}
}
