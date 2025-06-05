class ProjectAuthAPI {
	private path: string;
	private apikey: string;
	private baseUrl: string;

	constructor(apikey: string) {
		this.apikey = apikey;
		this.path = "/api/v1/projects";
		this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
	}

	public async getProject(projectId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${projectId}`, {
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

	public async getProjects(page: number = 1, limit: number = 10, filter: { name?: string } = {}) {
		const queryParams = new URLSearchParams();
		queryParams.set("page", page.toString());
		queryParams.set("limit", limit.toString());
		if (filter.name) queryParams.set("name", filter.name);

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

	public async createProject(project: {
		name: string;
		description?: string;
		workos_config_id: string;
		organization_name: string;
	}) {
		const response = await fetch(`${this.baseUrl}${this.path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify({
				name: project.name,
				description: project.description,
				workos_config: project.workos_config_id,
				organization_name: project.organization_name,
			}),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async updateProject(
		projectId: string,
		project: {
			name?: string;
			description?: string;
			workos_config?: string;
			organization_name?: string;
		}
	) {
		const response = await fetch(`${this.baseUrl}${this.path}/${projectId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(project),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async deleteProject(projectId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${projectId}`, {
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

export default ProjectAuthAPI;
