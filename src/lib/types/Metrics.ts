import type { Counter } from 'prom-client';

export type AmanekoCounters = {
	commands: Counter;
	interactions: Counter;
	notifications: {
		stream: Counter;
		community: Counter;
		relay: Counter;
	};
	tldex: {
		relay: Counter;
	};
};
