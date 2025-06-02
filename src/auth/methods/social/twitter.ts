import passport from "passport";
import JWTDelivery from "../../delivery/jwt";
import { Request, Response, NextFunction } from "express";
import { InducedAuthConfig, SocialProviderConfig } from "../../../config/types";
import { Strategy as TwitterStrategy } from "@superfaceai/passport-twitter-oauth2";
import { ProfileWithMetaData } from "@superfaceai/passport-twitter-oauth2/dist/models/profile";

class TwitterAuth {
	private initialized = false;
	private inducedAuthConfig: InducedAuthConfig;
	private twitterAuthConfig: SocialProviderConfig | undefined;

	constructor(inducedAuthConfig: InducedAuthConfig) {
		this.inducedAuthConfig = inducedAuthConfig;
		this.twitterAuthConfig = inducedAuthConfig.auth.methods.social?.twitter;

		// Early returns
		if (this.initialized) return;
		if (!this.twitterAuthConfig || !this.twitterAuthConfig.enabled) return;

		// Initialize passport strategy for Twitter OAuth 2.0
		const callbackURL =
			typeof this.twitterAuthConfig.callbackURL === "string"
				? this.twitterAuthConfig.callbackURL
				: this.twitterAuthConfig?.callbackURL?.[this.inducedAuthConfig.env || "development"];
		passport.use(
			new TwitterStrategy(
				{
					callbackURL: callbackURL!,
					clientID: this.twitterAuthConfig.clientID!,
					clientSecret: this.twitterAuthConfig.clientSecret!,
					clientType: this.twitterAuthConfig.clientType as "confidential" | "public",
					scope: this.twitterAuthConfig.scope || [
						"tweet.read",
						"users.read",
						"offline.access",
						"email",
					],
				},
				async (
					accessToken: string,
					refreshToken: string,
					profile: ProfileWithMetaData,
					done: (error: any, user?: any) => void
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

	// Redirects to Twitter for authentication
	authRouteMiddleware = (req: Request, res: Response, next: NextFunction) => {
		if (!this.twitterAuthConfig || !this.twitterAuthConfig.enabled)
			return next({ status: 500, message: "Twitter auth not enabled" });

		// Use passport.authenticate as middleware
		return passport.authenticate("twitter", {
			session: true,
			scope: this.twitterAuthConfig.scope || [
				"tweet.read",
				"users.read",
				"offline.access",
				"email",
			],
		})(req, res, next);
	};

	// Handles Twitter callback, does signUp or signIn
	callbackRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		if (!this.twitterAuthConfig || !this.twitterAuthConfig.enabled)
			return next({ status: 500, message: "Twitter auth not enabled" });

		// Use passport.authenticate to get profile
		passport.authenticate(
			"twitter",
			{ session: true },
			async (err: any, profile: ProfileWithMetaData, info: any) => {
				if (err) return next(err);
				if (!profile) return next({ status: 401, message: "Twitter authentication failed" });

				try {
					// Twitter OAuth2 profile may not always have email unless scope is set and user grants it
					// See: https://dev.to/superface/how-to-use-twitter-oauth-20-and-passportjs-for-user-login-33fk
					const email = (profile.emails && profile.emails[0]?.value) || undefined;
					if (!email) return next({ status: 400, message: "No email from Twitter profile" });

					let roleRedirectURL: string | undefined;
					let status: "registered" | "authenticated";
					const AuthenticatedUser = req.app.locals.AuthenticatedUser;
					let user = await AuthenticatedUser.findOne({ email });

					if (user) {
						// Sign in
						if (!user.social.twitter || Object.keys(user.social.twitter).length === 0) {
							user.social.twitter = {
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
								twitter: {
									id: profile.id,
									displayName: profile.displayName,
								},
							},
						});

						status = "registered";

						if (this.inducedAuthConfig.auth.rbac.enabled) {
							if (!this.inducedAuthConfig.auth.methods.social?.twitter?.roleRedirectURL) {
								return next({
									status: 400,
									message: "RBAC is enabled but roleRedirectURL is not set for Twitter auth",
								});
							}

							// @ts-ignore
							req.session.pendingUser = {
								id: user._id,
							};
							roleRedirectURL =
								typeof this.inducedAuthConfig.auth.methods.social?.twitter?.roleRedirectURL ===
								"string"
									? this.inducedAuthConfig.auth.methods.social?.twitter?.roleRedirectURL
									: this.inducedAuthConfig.auth.methods.social?.twitter?.roleRedirectURL?.[
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

		if (!this.twitterAuthConfig || !this.twitterAuthConfig.enabled)
			return next({ status: 500, message: "Twitter auth not enabled" });
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

export default TwitterAuth;
