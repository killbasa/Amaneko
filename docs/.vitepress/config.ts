import { defineConfig } from 'vitepress';

export default defineConfig({
	base: '/',
	lang: 'en-US',
	title: 'Amaneko Documentation',
	description: 'Documentation for Amaneko',
	lastUpdated: true,
	cleanUrls: true,
	sitemap: { hostname: 'https://docs.amaneko.ca' },
	themeConfig: {
		search: {
			provider: 'local'
		},
		socialLinks: [{ icon: 'github', link: 'https://github.com/killbasa/Amaneko' }],
		editLink: {
			pattern: 'https://github.com/killbasa/Amaneko/edit/main/docs/:path',
			text: 'Suggest changes to this page'
		},
		nav: [],
		sidebar: [
			{ text: 'Setup', link: '/setup' },
			{
				text: 'Commands',
				items: [
					{ text: 'Blacklist', link: '/commands/blacklist' },
					{ text: 'Cameo', link: '/commands/cameo' },
					{ text: 'Community post', link: '/commands/community-post' },
					{ text: 'Log channel', link: '/commands/log-channel' },
					{ text: 'Relay', link: '/commands/relay' },
					{ text: 'Schedule', link: '/commands/schedule' },
					{ text: 'YouTube', link: '/commands/youtube' }
				]
			}
		]
	},
	vite: {
		plugins: []
	},
	markdown: {},
	head: [
		['meta', { charset: 'utf-8' }],
		[
			'meta',
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			}
		],

		// OpenGraph
		['meta', { property: 'og:url', content: 'https://docs.amaneko.ca' }],
		['meta', { property: 'og:type', content: 'website' }],
		['meta', { property: 'og:title', content: 'Amaneko Documentation' }],
		['meta', { property: 'og:description', content: 'Documentation for Amaneko' }],
		[
			'meta',
			{
				property: 'theme-color',
				'data-react-helmet': 'true',
				content: '#9966CC'
			}
		]
	]
});
