import { getRootData } from '@sapphire/pieces';

export const mainFolder = getRootData().root;

export const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';
export const HOLODEX_WEBSOCKET_URL = 'wss://holodex.net';

export const HOLODEX_HEADER = 'X-APIKEY';

export const HolodexMembersOnlyPatterns = ['membersonly', 'members only', "member's only", 'member', 'メン限', 'メンバー限定'];

export const enum BrandColors {
	Default = '#9966CC',
	Success = '#33B54E',
	Error = 'Red'
}

export const AmanekoEmojis = {};

export const VTuberOrgEmojis = new Map<string, string>([
	['Hololive', 'Hololive'], //
	['PhaseConnect', 'PhaseConnect'],
	['PrismProject', 'PrismProject'],
	['Nijisanji', 'Nijisanji'],
	['NijisanjiEN', 'NijisanjiEN'],
	['IdolCorp', 'IdolCorp'],
	['VShojo', 'VShojo'],
	['VReverie', 'VReverie']
]);
