import type { Request } from "express";

import { ApiKeyDeliveryConfig } from "../../config/types";

class ApiKeyDelivery {
	private config: ApiKeyDeliveryConfig;

	constructor(apiKeyConfig: ApiKeyDeliveryConfig) {
		this.config = apiKeyConfig;
	}

	// Verify JWT
	async verifyAPIKey(req: Request) {
		const apiKey = req.headers["x-api-key"] as string;
		if (!apiKey || apiKey !== this.config.apiKeyValue) {
			return false;
		}
		return true;
	}
}

export default ApiKeyDelivery;
