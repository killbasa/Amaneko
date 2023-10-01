import type { Counter } from 'prom-client';

export type AmanekoCounters = {
	commands: Counter;
	interactions: Counter;
	notifications: {
		stream: Counter;
		community: Counter;
		relay: Counter;
		history: Counter;
	};
	tldex: {
		relay: Counter;
	};
};
