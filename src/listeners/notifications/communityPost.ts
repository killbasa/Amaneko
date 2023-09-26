import { AmanekoEvents } from '#lib/utils/Events';
import { BrandColors } from '#lib/utils/constants';
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
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: { channelId: post.channelId, communityPostChannelId: { not: null } },
			select: { communityPostChannelId: true, communityPostRoleId: true }
		});
		if (subscriptions.length === 0) return;

		const embed = this.buildEmbed(post);

		await Promise.allSettled([
			subscriptions.map(async ({ communityPostChannelId, communityPostRoleId }) => {
				const channel = await this.container.client.channels.fetch(communityPostChannelId!);
				if (!channel?.isTextBased()) return;

				const rolePing = communityPostRoleId ? roleMention(communityPostRoleId) : '';

				return channel.send({
					content: `:loudspeaker: ${rolePing} ${post.channelName} just published a community post!\n${post.url}`,
					embeds: [embed]
				});
			})
		]);

		await this.container.redis.hSet('communityposts', post.channelId, post.id);
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
