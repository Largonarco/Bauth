import express from "express";
import { AuthConfig, AuthMethod } from "./types";

const config: AuthConfig = {
	projectName: "Chargeflow",
	apikey: process.env.API_KEY!,
	workos: {
		signupEnabled: false,
		useDefaultWorkosConfig: true,
		env: process.env.NODE_ENV as "staging" | "production",
		enabled_auth_methods: [AuthMethod.SSO, AuthMethod.EMAIL_PASSWORD],
		rbac: {
			enabled: true,
			roles: [],
		},
		clientId: {
			staging: process.env.WORKOS_STAGING_CLIENTID!,
			production: process.env.WORKOS_PROD_CLIENTID!,
		},
		clientSecret: {
			staging: process.env.WORKOS_STAGING_CLIENT_SECRET!,
			production: process.env.WORKOS_PROD_CLIENT_SECRET!,
		},
		authkit: {
			enabled: true,
			logoutURL: {
				staging: "http://localhost:3000/auth/logout",
				production: "https://chargeflow.com/auth/logout",
			},
			redirectURL: {
				staging: "http://localhost:3000/auth/callback",
				production: "https://chargeflow.com/auth/callback",
			},
		},
		allowed_social_providers: [
			{
				provider: "google",
				redirectURL: {
					staging: "https://chargeflow.com/auth/google/callback",
					production: "https://chargeflow.com/auth/google/callback",
				},
			},
		],
		delivery: {
			apiKey: {
				enabled: false,
			},
			jwt: {
				enabled: true,
				expiresIn: 86400,
				sendVia: ["cookie"],
				secret: process.env.JWT_SECRET!,
				cookieOptions: {
					httpOnly: true,
					sameSite: "lax",
					name: "auth_token",
					secure: process.env.NODE_ENV === "production",
				},
			},
		},
	},
};

export default config;
