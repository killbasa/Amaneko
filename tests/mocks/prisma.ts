import { PrismaClient } from '@prisma/client';

export const client = new PrismaClient();

export async function purge(): Promise<void> {
	await client.$transaction([
		client.guild.deleteMany(), //
		client.holodexChannel.deleteMany(),
		client.subscription.deleteMany()
	]);
}

export async function seed(): Promise<void> {
	await client.$transaction([
		client.guild.createMany({
			data: [
				{ id: '1', relayTranslations: false, relayMods: false },
				{ id: '2', relayTranslations: true, relayMods: false },
				{ id: '3', relayTranslations: false, relayMods: true },
				{ id: '4', relayTranslations: true, relayMods: true }
			]
		}),
		client.guild.create({
			data: {
				id: '5',
				relayTranslations: true,
				relayMods: true,
				blacklist: { create: [{ id: '1', channelId: '1', channelName: 'Channel Name' }] }
			}
		}),
		client.holodexChannel.create({
			data: { id: '1', name: 'Channel Name' }
		}),
		client.subscription.createMany({
			data: [
				{ id: '1', guildId: '1', channelId: '1', relayChannelId: '1' },
				{ id: '2', guildId: '2', channelId: '1', relayChannelId: '1' },
				{ id: '3', guildId: '3', channelId: '1', relayChannelId: '1' },
				{ id: '4', guildId: '4', channelId: '1', relayChannelId: '1' },
				{ id: '5', guildId: '5', channelId: '1', relayChannelId: '1' }
			]
		})
	]);
}
