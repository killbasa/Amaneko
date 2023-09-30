import { AmanekoEvents } from '#lib/utils/Events';
import { BrandColors } from '#lib/utils/constants';
import { permissionsCheck } from '#utils/discord';
import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, roleMention } from 'discord.js';
import type { CommunityPostData } from '#lib/types/YouTube';

@ApplyOptions<Listener.Options>({
	name: AmanekoEvents.CommunityPost,
	event: AmanekoEvents.CommunityPost
})
export class NotificationListener extends Listener<typeof AmanekoEvents.CommunityPost> {
	public async run(post: CommunityPostData): Promise<void> {
		const { prisma, redis, client, metrics } = this.container;

		const subscriptions = await prisma.subscription.findMany({
			where: { channelId: post.channelId, communityPostChannelId: { not: null } },
			select: { communityPostChannelId: true, communityPostRoleId: true }
		});
		if (subscriptions.length === 0) return;

		const embed = this.buildEmbed(post);

		const result = await Promise.allSettled([
			subscriptions.map(async ({ communityPostChannelId, communityPostRoleId }) => {
				const channel = await client.channels.fetch(communityPostChannelId!);
				if (!channel?.isTextBased()) return;
				if (!(await permissionsCheck(channel.id))) {
					return;
				}

				const rolePing = communityPostRoleId ? roleMention(communityPostRoleId) : '';

				return channel.send({
					content: `:loudspeaker: ${rolePing} ${post.channelName} just published a community post!\n${post.url}`,
					embeds: [embed]
				});
			})
		]);

		await redis.hSet('communityposts', post.channelId, post.id);

		for (const entry of result) {
			metrics.incrementCommunityPost({ success: entry.status === 'fulfilled' });
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
