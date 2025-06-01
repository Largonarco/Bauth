import type mongoose from "mongoose";
import { Database } from "./db/index";
import BasicAuth from "./auth/methods/basic";
import { InducedAuthConfig } from "./config/types";
import type { Application, NextFunction, Request, Response } from "express";
import { AuthenticatedUser, AuthenticatedUserSchema } from "./db/models/user";
import session from "express-session";

class InducedAuth {
	public config: InducedAuthConfig;
	public mongooseConnection: mongoose.Connection | undefined;

	constructor(config: InducedAuthConfig) {
		this.config = config;

		// Validation
		const app = config.expressApp as Application;
		if (!app) {
			throw new Error("Express app instance must be provided in config.expressApp");
		}

		// Attaching config and models to app.locals
		(app as Application).locals.inducedAuthConfig = config;
		(app as Application).locals.AuthenticatedUser =
			config.database.userModel.discriminator<AuthenticatedUser>(
				"AuthenticatedUser",
				AuthenticatedUserSchema
			);

		// Session setup
		app.use(
			session({
				resave: false,
				saveUninitialized: false,
				secret: config.sessionOptions.secret,
				cookie: {
					secure: true,
					httpOnly: true,
					sameSite: config.env === "production" ? "strict" : "lax",
					maxAge: config.sessionOptions.cookie?.maxAge || 86400000,
				},
			})
		);

		// Setup Mongoose connection
		if (!config.database.mongooseConnection) {
			if (!config.database.mongoUrl) {
				throw new Error(
					"MongoDB connection string (mongoUrl) must be provided in config.database.mongoUrl"
				);
			}

			// New Mongoose connection
			const db = new Database(config.database);
			(app as Application).locals.mongooseConnection = db.connection;
		} else {
			// Existing Mongoose connection
			(app as Application).locals.mongooseConnection = config.database.mongooseConnection;
		}
	}

	public basicAuth() {
		const basicAuth = new BasicAuth(this.config);
		return {
			signUp: (req: Request, res: Response, next: NextFunction) =>
				basicAuth.signUpRouteMiddleware(req, res, next),
			signIn: (req: Request, res: Response, next: NextFunction) =>
				basicAuth.signInRouteMiddleware(req, res, next),
			secure: (req: Request, res: Response, next: NextFunction) =>
				basicAuth.secureRouteMiddleware(req, res, next),
			signOut: (req: Request, res: Response, next: NextFunction) =>
				basicAuth.signOutRouteMiddleware(req, res, next),
			resetPassword: (req: Request, res: Response, next: NextFunction) =>
				basicAuth.resetPasswordRouteMiddleware(req, res, next),
		};
	}

	public socialAuth() {
		return {};
	}
}

export default InducedAuth;
