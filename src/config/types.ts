import type { Application } from "express";
import type { Connection, Model } from "mongoose";

export type AuthProvider = "google" | "facebook" | "github" | "microsoft" | string; // for custom providers

// Methods
export interface EmailAuthConfig {
	enabled: boolean;
	emailVerification?: boolean;
}

export interface SocialProviderConfig {
	enabled: boolean;
	scope?: string[];
	clientID?: string;
	clientSecret?: string;
	profileFields?: string[];
	options?: Record<string, any>;
	callbackURL?: string | { [env: string]: string };
	roleRedirectURL?: string | { [env: string]: string };
	routes?: {
		loginPath?: string;
		callbackPath?: string;
	};
}

// Delivery
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
	refresh?: {
		enabled: boolean;
		expiresIn: number;
	};
	cookieOptions?: {
		name?: string;
		path?: string;
		domain?: string;
		secure?: boolean;
		httpOnly: boolean;
		sameSite?: "lax" | "strict" | "none";
	};
}

// RBAC
export interface RBACConfig {
	enabled: boolean;
	roles?: string[];
}

// Database [MongoDB]
export interface DatabaseConfig {
	mongoUrl?: string;
	userModel: Model<any>;
	collectionName?: string;
	mongooseConnection?: Connection;
}

export interface IndexConfig {
	fields: string[];
	options?: Record<string, any>;
}

// Main Config
export interface InducedAuthConfig {
	indexes?: IndexConfig[];
	expressApp: Application;
	database: DatabaseConfig;
	env: "development" | "staging" | "production";
	sessionOptions: {
		secret: string;
		cookie?: {
			maxAge?: number;
			secure?: boolean;
			httpOnly?: boolean;
			sameSite?: "lax" | "strict" | "none";
		};
	};
	auth: {
		rbac: RBACConfig;
		delivery: {
			jwt: JWTDeliveryConfig;
			apiKey: ApiKeyDeliveryConfig;
		};
		methods: {
			email: EmailAuthConfig;
			social?: {
				[provider in AuthProvider]?: SocialProviderConfig;
			};
		};
	};
}
