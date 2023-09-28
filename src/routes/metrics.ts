import { ApplyOptions } from '@sapphire/decorators';
import { Route, methods } from '@sapphire/plugin-api';
import { register } from 'prom-client';
import type { ApiRequest, ApiResponse, MimeTypes } from '@sapphire/plugin-api';

@ApplyOptions<Route.Options>({
	route: 'metrics'
})
export class ApiRoute extends Route {
	public async [methods.GET](_request: ApiRequest, response: ApiResponse): Promise<void> {
		try {
			response.setContentType(register.contentType as MimeTypes);
			response.end(await register.metrics());
		} catch (error: unknown) {
			this.container.logger.error(error);
			response.status(500).end();
		}
	}
}
