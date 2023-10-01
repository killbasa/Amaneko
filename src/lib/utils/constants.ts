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
	['Hololive', '<:Hololive:1158110352190476298>'], //
	['PhaseConnect', '<:PhaseConnect:1158110355642404875>'],
	['PrismProject', '<:PrismProject:1158110356825190421>'],
	['Nijisanji', '<:Nijisanji:1158111882222248057> '],
	['NijisanjiEN', '<:Nijisanji:1158111882222248057> '],
	['IdolCorp', '<:IdolCorp:1158110353025142804> '],
	['VShojo', '<:VShojo:1158110359136260226>'],
	['VReverie', '<:VReverie:1158112269293596672>']
]);
