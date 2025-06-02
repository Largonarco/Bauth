import passport from "passport";
import JWTDelivery from "../../delivery/jwt";
import { Request, Response, NextFunction } from "express";
import { InducedAuthConfig, SocialProviderConfig } from "../../../config/types";

import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";

class GoogleAuth {
	private initialized = false;
	private inducedAuthConfig: InducedAuthConfig;
	private googleAuthConfig: SocialProviderConfig | undefined;

	constructor(inducedAuthConfig: InducedAuthConfig) {
		this.inducedAuthConfig = inducedAuthConfig;
		this.googleAuthConfig = inducedAuthConfig.auth.methods.social?.google;

		// Early returns
		if (this.initialized) return;
		if (!this.googleAuthConfig || !this.googleAuthConfig.enabled) return;

		// Initialize passport strategy for Google
		const callbackURL =
			typeof this.googleAuthConfig.callbackURL === "string"
				? this.googleAuthConfig.callbackURL
				: this.googleAuthConfig?.callbackURL?.[this.inducedAuthConfig.env || "development"];
		passport.use(
			new GoogleStrategy(
				{
					callbackURL,
					clientID: this.googleAuthConfig.clientID!,
					clientSecret: this.googleAuthConfig.clientSecret!,
					scope: this.googleAuthConfig.scope || ["profile", "email"],
				},
				async (
					accessToken: string,
					refreshToken: string,
					profile: Profile,
					done: VerifyCallback
				) => {
					try {
						done(null, profile);
					} catch (err) {
						done(err);
					}
				}
			)
		);

		// Serialize/deserialize minimal user info
		passport.serializeUser((user: any, done) => done(null, user));
		passport.deserializeUser((obj: any, done) => done(null, obj));

		this.initialized = true;
	}

	// Redirects to Google for authentication
	authRouteMiddleware = (req: Request, res: Response, next: NextFunction) => {
		if (!this.googleAuthConfig || !this.googleAuthConfig.enabled)
			return next({ status: 500, message: "Google auth not enabled" });

		// Use passport.authenticate as middleware
		return passport.authenticate("google", {
			session: true,
			scope: this.googleAuthConfig.scope || ["profile", "email"],
		})(req, res, next);
	};

	// Handles Google callback, does signUp or signIn
	callbackRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		if (!this.googleAuthConfig || !this.googleAuthConfig.enabled)
			return next({ status: 500, message: "Google auth not enabled" });

		// Use passport.authenticate to get profile
		passport.authenticate(
			"google",
			{ session: true },
			async (err: any, profile: Profile, info: any) => {
				if (err) return next(err);
				if (!profile) return next({ status: 401, message: "Google authentication failed" });

				try {
					const email = profile.emails?.[0]?.value;
					if (!email) return next({ status: 400, message: "No email from Google profile" });

					let roleRedirectURL: string | undefined;
					let status: "registered" | "authenticated";
					const AuthenticatedUser = req.app.locals.AuthenticatedUser;
					let user = await AuthenticatedUser.findOne({ email });

					if (user) {
						// Sign in
						if (!user.social.google || Object.keys(user.social.google).length === 0) {
							user.social.google = {
								id: profile.id,
								displayName: profile.displayName,
							};
							await user.save();
						}

						status = "authenticated";
					} else {
						// Sign up
						user = await AuthenticatedUser.create({
							email,
							role: "user",
							social: {
								google: {
									id: profile.id,
									displayName: profile.displayName,
								},
							},
						});

						status = "registered";

						if (this.inducedAuthConfig.auth.rbac.enabled) {
							if (!this.inducedAuthConfig.auth.methods.social?.google?.roleRedirectURL) {
								return next({
									status: 400,
									message: "RBAC is enabled but roleRedirectURL is not set for Google auth",
								});
							}

							// @ts-ignore
							req.session.pendingUser = {
								id: user._id,
							};
							roleRedirectURL =
								typeof this.inducedAuthConfig.auth.methods.social?.google?.roleRedirectURL ===
								"string"
									? this.inducedAuthConfig.auth.methods.social?.google?.roleRedirectURL
									: this.inducedAuthConfig.auth.methods.social?.google?.roleRedirectURL?.[
											this.inducedAuthConfig.env || "development"
									  ];
						}
					}

					res.locals.auth = { user, status, role: user.role };

					// Delivery
					// JWT
					if (this.inducedAuthConfig.auth.delivery.jwt.enabled) {
						const jwt = new JWTDelivery(this.inducedAuthConfig.auth.delivery.jwt);
						const { token, res: jwtRes } = await jwt.signToken(
							{ id: user._id, role: user.role },
							res
						);
						res = jwtRes;

						if (this.inducedAuthConfig.auth.delivery.jwt.sendVia?.includes("header")) {
							res.locals.auth.token = {
								token,
								expiresIn: this.inducedAuthConfig.auth.delivery.jwt.expiresIn,
							};
						}
					}
					// API Key
					if (this.inducedAuthConfig.auth.delivery.apiKey.enabled) {
						res.locals.auth.apiKey = this.inducedAuthConfig.auth.delivery.apiKey.apiKeyValue;
					}

					// Redirect to role redirect URL
					if (roleRedirectURL) {
						return res.redirect(roleRedirectURL);
					}

					next();
				} catch (error) {
					next(error);
				}
			}
		)(req, res, next);
	};

	assignRoleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		const { role } = req.body;
		const { pendingUser } = req.session as any;

		if (!this.googleAuthConfig || !this.googleAuthConfig.enabled)
			return next({ status: 500, message: "Google auth not enabled" });
		if (!this.inducedAuthConfig.auth.rbac.enabled)
			return next({ status: 400, message: "RBAC is not enabled" });
		if (!role) return next({ status: 400, message: "Role is required" });
		if (!this.inducedAuthConfig.auth.rbac.roles?.includes(role))
			return next({ status: 400, message: "Invalid role" });
		if (!pendingUser) return next({ status: 400, message: "No pending user in session" });

		const AuthenticatedUser = req.app.locals.AuthenticatedUser;
		const user = await AuthenticatedUser.findByIdAndUpdate(pendingUser.id, { role }, { new: true });
		if (!user) return next({ status: 404, message: "User not found for role assignment" });

		res.locals.auth = { user, status: "role-assigned", role: user.role };

		// Delivery
		// JWT
		if (this.inducedAuthConfig.auth.delivery.jwt.enabled) {
			const jwt = new JWTDelivery(this.inducedAuthConfig.auth.delivery.jwt);
			const { token, res: jwtRes } = await jwt.signToken({ id: user._id, role: user.role }, res);
			res = jwtRes;

			if (this.inducedAuthConfig.auth.delivery.jwt.sendVia?.includes("header")) {
				res.locals.auth.token = {
					token,
					expiresIn: this.inducedAuthConfig.auth.delivery.jwt.expiresIn,
				};
			}
		}
		// API Key
		if (this.inducedAuthConfig.auth.delivery.apiKey.enabled) {
			res.locals.auth.apiKey = this.inducedAuthConfig.auth.delivery.apiKey.apiKeyValue;
		}

		next();
	};
}

export default GoogleAuth;
