import { defineConfig } from 'vitepress';

export default defineConfig({
	base: '/',
	lang: 'en-US',
	title: 'Amaneko Documentation',
	description: 'Documentation for Amaneko',
	lastUpdated: true,
	cleanUrls: true,
	// sitemap: { hostname: 'https://example.com' },
	themeConfig: {
		search: {
			provider: 'local'
		},
		editLink: {
			pattern: 'https://github.com/killbasa/Amaneko/edit/main/docs/:path',
			text: 'Suggest changes to this page'
		},
		nav: [],
		sidebar: []
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
		]
	]
});
