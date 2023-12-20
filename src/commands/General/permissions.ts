import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { AmanekoEmojis, BrandColors } from '#lib/utils/constants';
import { canSendGuildEmbeds, canSendGuildMessages, hasPermissions } from '#lib/utils/permissions';
import { channelLink } from '#lib/utils/youtube';
import { defaultReply } from '#lib/utils/reply';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import type { ChannelTypes } from '@sapphire/discord.js-utilities';

const enum Features {
	youtube = 'youtube',
	youtubeMember = 'youtube_member',
	relay = 'relay',
	cameo = 'cameo',
	logs = 'logs',
	community = 'community'
}

@ApplyOptions<AmanekoCommand.Options>({
	description: 'Check if the bot has valid permissions for a feature.'
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('permissions')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
				.setDMPermission(false)
				.addStringOption((option) =>
					option //
						.setName('feature')
						.setDescription('Select a feature to check.')
						.setRequired(true)
						.setChoices(
							{ name: Features.youtube, value: Features.youtube },
							{ name: Features.youtubeMember, value: Features.youtubeMember },
							{ name: Features.relay, value: Features.relay },
							{ name: Features.cameo, value: Features.cameo },
							{ name: Features.logs, value: Features.logs },
							{ name: Features.community, value: Features.community }
						)
				)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();
		const feature = interaction.options.getString('feature', true) as Features;

		switch (feature) {
			case Features.youtube: {
				await this.handleYoutube(interaction);
				break;
			}
			case Features.youtubeMember: {
				await this.handleYoutubeMember(interaction);
				break;
			}
			case Features.relay: {
				await this.handleRelay(interaction);
				break;
			}
			case Features.cameo: {
				await this.handleCameo(interaction);
				break;
			}
			case Features.community: {
				await this.handleCommunityPost(interaction);
				break;
			}
			default: {
				await this.handleLogs(interaction);
			}
		}
	}

	private async handleYoutube(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				discordChannelId: { not: null }
			},
			select: {
				discordChannelId: true,
				channel: {
					select: { id: true, name: true }
				}
			}
		});

		await this.reply({
			interaction,
			check: canSendGuildEmbeds,
			title: 'Permissions for YouTube subscriptions',
			description: '**Required permissions:**\n• `View Channel`\n• `Send Messages`\n• `Embed Links`',
			subscriptions: subscriptions.map((subscription) => {
				return { ...subscription, discordChannelId: subscription.discordChannelId! };
			})
		});
	}

	private async handleYoutubeMember(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				memberDiscordChannelId: { not: null }
			},
			select: {
				memberDiscordChannelId: true,
				channel: {
					select: { id: true, name: true }
				}
			}
		});

		await this.reply({
			interaction,
			check: canSendGuildEmbeds,
			title: 'Permissions for YouTube member subscriptions',
			description: '**Required permissions:**\n• `View Channel`\n• `Send Messages`\n• `Embed Links`',
			subscriptions: subscriptions.map((subscription) => {
				return { ...subscription, discordChannelId: subscription.memberDiscordChannelId! };
			})
		});
	}

	private async handleRelay(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				relayChannelId: { not: null }
			},
			select: {
				relayChannelId: true,
				channel: {
					select: { id: true, name: true }
				}
			}
		});

		await this.reply({
			interaction,
			check: canSendGuildMessages,
			title: 'Permissions for relay subscriptions',
			description: '**Required permissions:**\n• `View Channel`\n• `Send Messages`',
			subscriptions: subscriptions.map((subscription) => {
				return { ...subscription, discordChannelId: subscription.relayChannelId! };
			})
		});
	}

	private async handleCameo(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				cameoChannelId: { not: null }
			},
			select: {
				cameoChannelId: true,
				channel: {
					select: { id: true, name: true }
				}
			}
		});

		await this.reply({
			interaction,
			check: canSendGuildMessages,
			title: 'Permissions for cameo subscriptions',
			description: '**Required permissions:**\n• `View Channel`\n• `Send Messages`',
			subscriptions: subscriptions.map((subscription) => {
				return { ...subscription, discordChannelId: subscription.cameoChannelId! };
			})
		});
	}

	private async handleCommunityPost(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const subscriptions = await this.container.prisma.subscription.findMany({
			where: {
				guildId: interaction.guildId,
				communityPostChannelId: { not: null }
			},
			select: {
				communityPostChannelId: true,
				channel: {
					select: { id: true, name: true }
				}
			}
		});

		await this.reply({
			interaction,
			check: canSendGuildEmbeds,
			title: 'Permissions for community post subscriptions',
			description: '**Required permissions:**\n• `View Channel`\n• `Send Messages`\n• `Embed Links`',
			subscriptions: subscriptions.map((subscription) => {
				return { ...subscription, discordChannelId: subscription.communityPostChannelId! };
			})
		});
	}

	private async handleLogs(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const settings = await this.container.prisma.guild.findUnique({
			where: {
				id: interaction.guildId,
				relayHistoryChannelId: { not: null }
			},
			select: { relayHistoryChannelId: true }
		});
		if (settings === null) {
			await defaultReply(interaction, 'There is no relay log channel set. You can set one with `/logchannel set`.');
			return;
		}

		const channel = await this.container.client.channels.fetch(settings.relayHistoryChannelId!);
		const view = hasPermissions(channel, PermissionFlagsBits.ViewChannel) ? AmanekoEmojis.GreenCheck : AmanekoEmojis.RedX;
		const send = hasPermissions(channel, PermissionFlagsBits.SendMessages) ? AmanekoEmojis.GreenCheck : AmanekoEmojis.RedX;
		const files = hasPermissions(channel, PermissionFlagsBits.AttachFiles) ? AmanekoEmojis.GreenCheck : AmanekoEmojis.RedX;

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor(BrandColors.Default) //
					.setTitle('Permissions for relay logs')
					.setDescription(`\`View Channel\`: ${view}\n\`Send Messages\`: ${send}\n\`Attach Files\`: ${files}`)
			]
		});
	}

	private async reply(data: {
		interaction: AmanekoCommand.ChatInputCommandInteraction;
		check: (channel: ChannelTypes | null) => boolean;
		title: string;
		description: string;
		subscriptions: { discordChannelId: string; channel: { name: string; id: string } }[];
	}): Promise<void> {
		const { interaction, title, description, subscriptions, check } = data;

		let list = 'There are no subscriptions.';
		if (subscriptions.length > 0) {
			const array = await Promise.all(
				subscriptions //
					.map(async ({ discordChannelId, channel }) => {
						const discordChannel = await this.container.client.channels.fetch(discordChannelId);
						const entry = `${channelLink(channel.name, channel.id)} in ${channelMention(discordChannelId)}`;

						return `${entry}: ${
							check(discordChannel) //
								? AmanekoEmojis.GreenCheck
								: AmanekoEmojis.RedX
						}`;
					})
			);
			list = array.join('\n');
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setColor(BrandColors.Default) //
					.setTitle(title)
					.setDescription(`${description}\n\n**Subscriptions:**\n${list}`)
			]
		});
	}
}
