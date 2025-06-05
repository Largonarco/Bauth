import AuthAPI from "../../../api";
import { WorkOS } from "@workos-inc/node";

import { AuthConfig } from "../../../config/types";
import OAuth from "./oauth";
import Password from "./password";

class Standard {
	private workos: WorkOS;
	private authAPI: AuthAPI;
	private config: AuthConfig;

	constructor(config: AuthConfig, authAPI: AuthAPI) {
		this.config = config;
		this.authAPI = authAPI;
		this.workos = new WorkOS(config.workos.clientSecret[config.workos.env]);
	}

	public oauth(provider: "AppleOAuth" | "GoogleOAuth" | "MicrosoftOAuth" | "GithubOAuth") {
		return new OAuth(this.config, this.authAPI, this.workos, provider);
	}

	public password() {
		return new Password(this.config, this.authAPI, this.workos);
	}
}

export default Standard;
