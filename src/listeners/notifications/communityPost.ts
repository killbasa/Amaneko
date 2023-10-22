import { AmanekoEvents } from '#lib/utils/enums';
import { BrandColors } from '#lib/utils/constants';
import { AmanekoListener } from '#lib/extensions/AmanekoListener';
import { canSendGuildMessages } from '#lib/utils/permissions';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, roleMention } from 'discord.js';
import type { CommunityPostData } from '#lib/types/YouTube';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.CommunityPost,
	event: AmanekoEvents.CommunityPost
})
export class NotificationListener extends AmanekoListener<typeof AmanekoEvents.CommunityPost> {
	public async run(post: CommunityPostData): Promise<void> {
		const { tracer, container } = this;
		const { prisma, redis, client, metrics } = container;

		await tracer.createSpan('community_post_notify', async () => {
			const subscriptions = await tracer.createSpan('find-subscriptions', async () => {
				return prisma.subscription.findMany({
					where: { channelId: post.channelId, communityPostChannelId: { not: null } },
					select: { guildId: true, communityPostChannelId: true, communityPostRoleId: true }
				});
			});
			if (subscriptions.length === 0) return;

			await tracer.createSpan('process_subscriptions', async () => {
				const embed = this.buildEmbed(post);

				const result = await Promise.allSettled([
					subscriptions.map(async ({ guildId, communityPostChannelId, communityPostRoleId }) => {
						return tracer.createSpan(`process_subscription:${guildId}`, async () => {
							const channel = await client.channels.fetch(communityPostChannelId!);
							if (!canSendGuildMessages(channel)) return;

							const rolePing = communityPostRoleId ? roleMention(communityPostRoleId) : '';

							return channel.send({
								content: `:loudspeaker: ${rolePing} ${post.channelName} just published a community post!\n${post.url}`,
								embeds: [embed]
							});
						});
					})
				]);

				await redis.hSet('communityposts', post.channelId, post.id);

				for (const entry of result) {
					metrics.counters.incCommunityNotif({ success: entry.status === 'fulfilled' });
				}
			});
		});
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
