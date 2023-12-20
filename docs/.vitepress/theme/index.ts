import KofiButton from '../components/KofiButton.vue';
import DefaultTheme from 'vitepress/theme';
import { Theme } from 'vitepress';

import './custom.css';

const theme: Theme = {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component('KofiButton', KofiButton);
	}
};

export default theme;
