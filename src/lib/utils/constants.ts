import { getRootData } from '@sapphire/pieces';

export const mainFolder = getRootData().root;

export const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';
export const HOLODEX_WEBSOCKET_URL = 'wss://holodex.net';

export const HOLODEX_HEADER = 'X-APIKEY';

export const HolodexMembersOnlyPatterns = ['membersonly', 'members only', "member's only", 'member', 'メン限', 'メンバー限定'];

export const YoutubeEmojiRegex = /https:\/\/yt\d+\.ggpht\.com\/[a-zA-Z0-9_\-=/]+-c-k-nd|www\.youtube\.com\/[a-zA-Z0-9_\-=/]+\.svg/gi;

export const enum BrandColors {
	Default = '#9966CC',
	Success = '#33B54E',
	Error = 'Red'
}

export const AmanekoEmojis = {
	Tools: ':tools:',
	Speech: ':speech_balloon:',
	Speaker: ':loud_sound:'
};

export const VTuberOrgEmojis = new Map<string, string>([
	['Hololive', '<:Hololive:1158110352190476298>'], //
	['Phase Connect', '<:PhaseConnect:1158110355642404875>'],
	['PRISM Project', '<:PrismProject:1158110356825190421>'],
	['Nijisanji', '<:Nijisanji:1158111882222248057> '],
	['Nijisanji EN', '<:Nijisanji:1158111882222248057> '],
	['Idol', '<:IdolCorp:1158110353025142804> '],
	['VShojo', '<:VShojo:1158110359136260226>'],
	['VReverie', '<:VReverie:1158112269293596672>']
]);
