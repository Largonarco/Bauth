// Auth Methods Enum
export enum AuthMethod {
	SSO = "sso",
	MFA = "mfa",
	SOCIAL = "social",
	MAGIC_LINK = "magic_link",
	EMAIL_PASSWORD = "email_password",
}

// Social Provider Config
export type SocialProvider = {
	provider: string;
	redirectURL: { staging: string; production?: string };
};

// AuthKit Config
export interface AuthKitConfig {
	enabled: boolean;
	logoutURL: { staging: string; production?: string };
	redirectURL: { staging: string; production?: string };
}

// Delivery Configs
export interface ApiKeyDeliveryConfig {
	enabled: boolean;
	headerName?: string;
	apiKeyValue?: string;
}

export interface JWTDeliveryConfig {
	secret?: string;
	enabled: boolean;
	expiresIn?: number;
	sendVia?: ("cookie" | "header")[];
	cookieOptions?: {
		name?: string;
		path?: string;
		domain?: string;
		secure?: boolean;
		httpOnly: boolean;
		sameSite?: "lax" | "strict" | "none";
	};
}

// RBAC Config
export interface RBACConfig {
	enabled: boolean;
	roles?: {
		name: string;
		permissions: string[];
	}[];
}

// Main Config
export interface AuthConfig {
	apikey: string;
	projectName: string;
	workos: {
		rbac: RBACConfig;
		signupEnabled: boolean;
		authkit: AuthKitConfig;
		env: "staging" | "production";
		useDefaultWorkosConfig: boolean;
		enabled_auth_methods: AuthMethod[];
		allowed_social_providers: SocialProvider[];
		clientId: { staging: string; production?: string };
		clientSecret: { staging: string; production?: string };
		delivery: {
			jwt: JWTDeliveryConfig;
			apiKey: ApiKeyDeliveryConfig;
		};
	};
}
