import { AmanekoNotifier } from '#lib/extensions/AmanekoNotifier';
import { Store } from '@sapphire/framework';

export class NotifierStore extends Store<AmanekoNotifier<any>, 'notifiers'> {
	public constructor() {
		super(AmanekoNotifier, { name: 'notifiers' });
	}

	public override get(name: string): AmanekoNotifier<any> {
		const piece = super.get(name);
		if (!piece) throw new Error(`The notifier "${name}" is not loaded.`);

		return piece;
	}
}
