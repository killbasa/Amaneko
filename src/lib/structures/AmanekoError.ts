/**
 * Error to be thrown for user-facing errors.
 */
export class AmanekoError extends Error {
	public readonly context: unknown;

	/**
	 * @param message - The message to show the user.
	 * @param context - Any additional error context.
	 */
	public constructor(message: string, context?: unknown) {
		super(message);
		this.context = context;
	}
}
