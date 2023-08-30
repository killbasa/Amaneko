import type { ClientConfig } from './Config';

declare module '@sapphire/pieces' {
	interface Container {
		config: ClientConfig;
	}
}
