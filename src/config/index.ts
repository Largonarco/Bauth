// src/config/index.ts

import express from "express";
import { Model } from "mongoose";

import { InducedAuthConfig } from "./types";

const config: InducedAuthConfig = {
	expressApp: express(),
	env: process.env.NODE_ENV as "development" | "staging" | "production",
	database: {
		userModel: Model,
		mongoUrl: process.env.MONGO_URL,
	},
	sessionOptions: {
		secret: process.env.SESSION_SECRET!,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
		},
	},
	indexes: [
		{ fields: ["roles"] },
		{ fields: ["apiKeys"] },
		{ fields: ["social.google.id"] },
		{ fields: ["email"], options: { unique: true } },
	],
	auth: {
		rbac: {
			enabled: true,
			roles: ["user", "admin", "superadmin"],
		},
		methods: {
			email: {
				enabled: true,
				emailVerification: true,
			},
			social: {
				google: {
					enabled: true,
					scope: ["profile", "email"],
					clientID: process.env.GOOGLE_CLIENT_ID!,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
					callbackURL: {
						production: "https://myapp.com/auth/google/callback",
						development: "http://localhost:3000/auth/google/callback",
					},
					routes: {
						loginPath: "/auth/google",
						callbackPath: "/auth/google/callback",
					},
				},
			},
		},
		delivery: {
			apiKey: {
				enabled: false,
			},
			jwt: {
				enabled: true,
				expiresIn: 86400,
				sendVia: ["cookie"],
				secret: process.env.JWT_SECRET!,
				refresh: { enabled: true, expiresIn: 604800 },
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
