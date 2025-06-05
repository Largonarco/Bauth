class UserAuthAPI {
	private path: string;
	private apikey: string;
	private baseUrl: string;

	constructor(apikey: string) {
		this.apikey = apikey;
		this.path = "/api/v1/users";
		this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
	}

	public async getUser(userId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${userId}`, {
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

	public async getUsers(
		page: number = 1,
		limit: number = 10,
		filter: { email?: string; phone?: string } = {}
	) {
		const queryParams = new URLSearchParams();
		queryParams.set("page", page.toString());
		queryParams.set("limit", limit.toString());
		if (filter.email) queryParams.set("email", filter.email);
		if (filter.phone) queryParams.set("phone", filter.phone);

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

	public async createUser(user: {
		email: string;
		phone?: string;
		first_name: string;
		last_name: string;
	}) {
		const response = await fetch(`${this.baseUrl}${this.path}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apikey,
			},
			body: JSON.stringify(user),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async updateUser(
		userId: string,
		user: {
			email?: string;
			phone?: string;
			first_name?: string;
			last_name?: string;
		}
	) {
		const response = await fetch(`${this.baseUrl}${this.path}/${userId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apikey}`,
			},
			body: JSON.stringify(user),
		});

		return {
			success: response.ok,
			data: await response.json(),
		};
	}

	public async deleteUser(userId: string) {
		const response = await fetch(`${this.baseUrl}${this.path}/${userId}`, {
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

export default UserAuthAPI;
