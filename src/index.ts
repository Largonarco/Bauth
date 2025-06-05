import AuthAPI from "./api";

import { AuthConfig } from "./config/types";
import AuthKit from "./auth/methods/authkit";
import Password from "./auth/methods/standard/password";
import OAuth from "./auth/methods/standard/oauth";
import Standard from "./auth/methods/standard";

class Auth {
	public authAPI: AuthAPI;
	public config: AuthConfig;

	constructor(config: AuthConfig) {
		if (!config.projectName) throw new Error("Project name is required");

		const authAPI = new AuthAPI(config.apikey);

		this.config = config;
		this.authAPI = authAPI;

		this.init();
	}

	public async init() {
		const projects = await this.authAPI.project().getAll(1, 1, { name: this.config.projectName });
		if (projects.success && projects.data.projects.length === 0) {
			throw new Error("No such Project found. First create a project using the CLI.");
		}

		const project = projects.data.projects[0];

		if (project.workos_config) {
			const workosConfig = await this.authAPI.workosConfig().get(project.workos_config);
			if (!workosConfig.success) {
				throw new Error(
					"No WorkOS Config found. First create a WorkOS Config and link it to the project using the CLI."
				);
			}

			this.config.workos.rbac = workosConfig.data.workosConfig.rbac;
			this.config.workos.authkit = workosConfig.data.workosConfig.authkit;
			this.config.workos.clientId = workosConfig.data.workosConfig.workos_client_id;
			this.config.workos.signupEnabled = workosConfig.data.workosConfig.signup_enabled;
			this.config.workos.clientSecret = workosConfig.data.workosConfig.workos_client_secret;
			this.config.workos.useDefaultWorkosConfig = workosConfig.data.workosConfig.is_default;
			this.config.workos.allowed_social_providers =
				workosConfig.data.workosConfig.allowed_social_providers;
			this.config.workos.enabled_auth_methods = workosConfig.data.workosConfig.enabled_auth_methods;
		}
	}

	public async authkit() {
		if (!this.config.workos.authkit.enabled) {
			throw new Error("AuthKit is not enabled for this project. Use standard() method.");
		}

		const authkit = new AuthKit(this.config, this.authAPI);

		return authkit;
	}

	public async standard() {
		if (this.config.workos.authkit.enabled) {
			throw new Error("AuthKit is enabled for this project. Use authkit() method instead.");
		}

		const standard = new Standard(this.config, this.authAPI);

		return standard;
	}
}

export default Auth;
