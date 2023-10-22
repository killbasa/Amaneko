import { AmanekoCommand } from '#lib/extensions/AmanekoCommand';
import { BrandColors } from '#lib/utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import type { APIEmbedField } from 'discord.js';

const enum Categories {
	general = 'general',
	notifications = 'notifications',
	relay = 'relay'
}

@ApplyOptions<AmanekoCommand.Options>({
	description: "Get info about the bot and all of it's commands."
})
export class Command extends AmanekoCommand {
	public override registerApplicationCommands(registry: AmanekoCommand.Registry): void {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('help')
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.addStringOption((option) =>
					option //
						.setName('category')
						.setDescription('Select a category to get help for.')
						.setRequired(false)
						.setChoices(
							{ name: Categories.general, value: Categories.general }, //
							{ name: Categories.notifications, value: Categories.notifications },
							{ name: Categories.relay, value: Categories.relay }
						)
				)
		);
	}

	public override async chatInputRun(interaction: AmanekoCommand.ChatInputCommandInteraction): Promise<void> {
		const category = interaction.options.getString('category');
		const embed = new EmbedBuilder() //
			.setColor(BrandColors.Default)
			.setAuthor({ name: 'Amaneko' });

		if (category !== null) {
			await interaction.reply({
				embeds: [embed.setFields(this.getCategoryInfo(category as Categories))]
			});
			return;
		}

		await interaction.reply({
			embeds: [
				embed
					.setDescription('To get info about a category, you can run `/help <category>`')
					.setFields(
						{ name: 'Relays', value: 'Run `/relay list` to view.' },
						{ name: 'Cameos', value: 'Run `/cameo list` to view.' },
						{ name: 'Community posts', value: 'Run `/community list` to view.' },
						{ name: 'YouTube notifications', value: 'Run `/youtube list` to view.' }
					)
			]
		});
	}

	private getCategoryInfo(category: Categories): APIEmbedField[] {
		switch (category) {
			case Categories.general: {
				return [
					{
						name: '/ping',
						value: 'Ping the bot to see if it is alive.'
					}
				];
			}
			case Categories.notifications: {
				return [
					{
						name: '/community [add | remove | clear | list]',
						value: 'Manage YouTube community post notifications.'
					},
					{
						name: '/schedule [set | unset | settings]',
						value: 'Sets up and manages a schedule for upcoming streams from currently subscribed channels.'
					},
					{
						name: '/youtube [subscribe | unsubscribe | clear | list]',
						value: 'Manage YouTube livestream notifications.'
					},
					{
						name: '/youtube member [subscribe | unsubscribe]',
						value: 'Manage YouTube member livestream notifications.'
					}
				];
			}
			case Categories.relay: {
				return [
					{
						name: '/blacklist [add | remove | clear | list]',
						value: 'Manage the stream chat relay blacklist.'
					},
					{
						name: '/cameo [add | remove | clear | list]',
						value: "Start or stop sending a streamer's cameos."
					},
					{
						name: '/logchannel [set | clear | show]',
						value: 'Have relay logs sent to a specific channel.'
					},
					{
						name: '/relay [add | remove | settings | clear | list]',
						value: "Start or stop relaying a streamer's translations."
					}
				];
			}
		}
	}
}
