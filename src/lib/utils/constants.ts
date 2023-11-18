import { getRootData } from '@sapphire/pieces';
import { ChannelType } from 'discord.js';

export const mainFolder = getRootData().root;

export const HOLODEX_BASE_URL = 'https://holodex.net/api/v2';
export const HOLODEX_WEBSOCKET_URL = 'wss://holodex.net';

export const HOLODEX_HEADER = 'X-APIKEY';

export const HolodexMembersOnlyPatterns = ['membersonly', 'members only', "member's only", 'member', 'メン限', 'メンバー限定'];

export const YoutubeEmojiRegex = /https:\/\/yt\d+\.ggpht\.com\/[a-zA-Z0-9_\-=/]+-c-k-nd|www\.youtube\.com\/[a-zA-Z0-9_\-=/]+\.svg/gi;

export const NotifChannelTypes = [ChannelType.GuildAnnouncement, ChannelType.GuildText] as const;

export const DevSettingsKey = 'amaneko:dev_settings';

export const enum BrandColors {
	Default = '#9966CC',
	Success = '#33B54E',
	Error = 'Red'
}

export const AmanekoEmojis = {
	Tools: ':tools:',
	Speech: ':speech_balloon:',
	Speaker: ':loud_sound:',
	GreenCheck: '✅',
	RedX: '❌',
	Block: '🚫'
};

export const VTuberOrgEmojis = new Map<string, string>([
	['774inc', '<:774inc:1169798246273659012>'],
	['Aogiri Highschool', '<:AogiriHighschool:1169798248454688901>'],
	['.LIVE', '<:DotLive:1169798249360674836>'],
	['EIEN Project', '<:EIENProject:1169776110209339402>'],
	['Hololive', '<:Hololive:1158110352190476298>'],
	['idol Corp', '<:idolCorp:1158110353025142804>'],
	['KAMITSUBAKI', '<:KAMITSUBAKI:1169798251285848074>'],
	['MAHA5', '<:MAHA5:1169798252871286784>'],
	['Meridian Project', '<:MeridianProject:1169798253882130462>'],
	['MyHolo TV', '<:MyHoloTV:1169798254590963825>'],
	['Neo-Porte', '<:NeoPorte:1169955190267449374>'],
	['Nijisanji', '<:Nijisanji:1158111882222248057>'],
	['Nijisanji EN', '<:Nijisanji:1158111882222248057>'],
	['Nori Pro', '<:NoriPro:1158867476071845968>'],
	['Phase Connect', '<:PhaseConnect:1158110355642404875>'],
	['Pixela Project', '<:PixelaProject:1169955553393512458>'],
	['PRISM', '<:PRISMProject:1158110356825190421>'],
	['ProPro', '<:ProPro:1169798258541989919>'],
	['ReAcT', '<:ReAcT:1169955586436255814>'],
	['Riot Music', '<:RiotMusic:1169955860672430110>'],
	['Twitch Independents', '<:TwitchIndependent:1169776111853510736>'],
	['V4Mirai', '<:V4Mirai:1169958302436835378>'],
	['VEE', '<:VEE:1169956825035198554>'],
	['VReverie', '<:VReverie:1158112269293596672>'],
	['VShojo', '<:VShojo:1158110359136260226>'],
	['VSpo', '<:VSpo:1158867477112029264>'],
	['V&U', '<:VnU:1169798260802715708>']
]);
