import { getRootData } from '@sapphire/pieces';
import type { ColorResolvable } from 'discord.js';

export const mainFolder = getRootData().root;

export const BrandColors: Record<string, ColorResolvable> = {
	Default: '#9966CC'
};
