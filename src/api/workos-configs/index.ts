import { SocialProvider } from "../../config/types";

class WorkOSConfigAuthAPI {
	private path: string;
	private apikey: string;
	private baseUrl: string;

	constructor(apikey: string) {
		this.apikey = apikey;
		this.path = "/api/v1/workos-configs";
		this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
	}

	public async getWorkOSConfig(workosConfigId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${workosConfigId}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async getWorkOSConfigs(
		page: number = 1,
		limit: number = 10,
		filter: {
			invite_only?: boolean;
			rbac_enabled?: boolean;
			authkit_enabled?: boolean;
		} = {}
	) {
		const queryParams = new URLSearchParams();
		queryParams.set("page", page.toString());
		queryParams.set("limit", limit.toString());
		if (filter.invite_only !== undefined) {
			queryParams.set("invite_only", filter.invite_only.toString());
		}
		if (filter.rbac_enabled !== undefined) {
			queryParams.set("rbac_enabled", filter.rbac_enabled.toString());
		}
		if (filter.authkit_enabled !== undefined) {
			queryParams.set("authkit_enabled", filter.authkit_enabled.toString());
		}

		const response = await fetch(`${this.baseUrl}${this.path}?${queryParams.toString()}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async createWorkOSConfig(workosConfig: {
		invite_only: boolean;
		is_default: boolean;
		rbac_enabled: boolean;
		authkit_enabled: boolean;
		enabled_auth_methods?: string[];
		metadata?: Record<string, any>;
		allowed_social_providers?: SocialProvider[];
		workos_client_id: {
			staging: string;
			production?: string;
		};
		workos_client_secret: {
			staging: string;
			production?: string;
		};
	}) {
		const response = await fetch(`${this.baseUrl}${this.path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(workosConfig),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async updateWorkOSConfig(
		workosConfigId: string,
		workosConfig: {
			is_default?: boolean;
			invite_only?: boolean;
			rbac_enabled?: boolean;
			workos_client_id?: string;
			authkit_enabled?: boolean;
			workos_client_secret?: string;
			metadata?: Record<string, any>;
			enabled_auth_methods?: string[];
			allowed_social_providers?: string[];
		}
	) {
		const response = await fetch(`${this.baseUrl}${this.path}/${workosConfigId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(workosConfig),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async deleteWorkOSConfig(workosConfigId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${workosConfigId}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}
}

export default WorkOSConfigAuthAPI;
