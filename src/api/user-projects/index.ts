class UserProjectRelationAuthAPI {
	private path: string;
	private apikey: string;
	private baseUrl: string;

	constructor(apikey: string) {
		this.apikey = apikey;
		this.path = "/api/v1/user-projects";
		this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
	}

	public async createUserProjectRelation(relation: {
		user_id: string;
		project_id: string;
		session_ids?: string[];
		workos_user_id?: string;
		role: {
			name: string;
			permissions: string[];
		};
	}) {
		const response = await fetch(`${this.baseUrl}${this.path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(relation),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async getUserProjectRelations(
		page: number = 1,
		limit: number = 10,
		filter: { user_id?: string; project_id?: string; workos_user_id?: string } = {}
	) {
		const queryParams = new URLSearchParams();
		queryParams.set("page", page.toString());
		queryParams.set("limit", limit.toString());
		if (filter.user_id) queryParams.set("user_id", filter.user_id);
		if (filter.project_id) queryParams.set("project_id", filter.project_id);
		if (filter.workos_user_id) queryParams.set("workos_user_id", filter.workos_user_id);

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

	public async getUserProjectRelation(relationId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${relationId}`, {
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

	public async updateUserProjectRelation(
		relationId: string,
		relation: {
			role?: {
				name: string;
				permissions: string[];
			};
			session_ids?: string[];
		}
	) {
		const response = await fetch(`${this.baseUrl}${this.path}/${relationId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(relation),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async deleteUserProjectRelation(relationId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${relationId}`, {
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

export default UserProjectRelationAuthAPI;
