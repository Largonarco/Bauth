import passport from "passport";
import JWTDelivery from "../../delivery/jwt";
import { Request, Response, NextFunction } from "express";
import { Strategy as FacebookStrategy, Profile } from "passport-facebook";
import { InducedAuthConfig, SocialProviderConfig } from "../../../config/types";

class FacebookAuth {
	private initialized = false;
	private inducedAuthConfig: InducedAuthConfig;
	private facebookAuthConfig: SocialProviderConfig | undefined;

	constructor(inducedAuthConfig: InducedAuthConfig) {
		this.inducedAuthConfig = inducedAuthConfig;
		this.facebookAuthConfig = inducedAuthConfig.auth.methods.social?.facebook;

		// Early returns
		if (this.initialized) return;
		if (!this.facebookAuthConfig || !this.facebookAuthConfig.enabled) return;

		// Initialize passport strategy for Facebook
		const callbackURL =
			typeof this.facebookAuthConfig.callbackURL === "string"
				? this.facebookAuthConfig.callbackURL
				: this.facebookAuthConfig?.callbackURL?.[this.inducedAuthConfig.env || "development"];
		passport.use(
			new FacebookStrategy(
				{
					callbackURL: callbackURL!,
					clientID: this.facebookAuthConfig.clientID!,
					clientSecret: this.facebookAuthConfig.clientSecret!,
					scope: this.facebookAuthConfig.scope || ["email", "public_profile"],
					profileFields: this.facebookAuthConfig.profileFields || [
						"id",
						"email",
						"photos",
						"displayName",
					],
				},
				async (
					accessToken: string,
					refreshToken: string,
					profile: Profile,
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

	// Redirects to Facebook for authentication
	authRouteMiddleware = (req: Request, res: Response, next: NextFunction) => {
		if (!this.facebookAuthConfig || !this.facebookAuthConfig.enabled)
			return next({ status: 500, message: "Facebook auth not enabled" });

		// Use passport.authenticate as middleware
		return passport.authenticate("facebook", {
			session: true,
			scope: this.facebookAuthConfig.scope || ["email", "public_profile"],
		})(req, res, next);
	};

	// Handles Facebook callback, does signUp or signIn
	callbackRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		if (!this.facebookAuthConfig || !this.facebookAuthConfig.enabled)
			return next({ status: 500, message: "Facebook auth not enabled" });

		// Use passport.authenticate to get profile
		passport.authenticate(
			"facebook",
			{ session: true },
			async (err: any, profile: Profile, info: any) => {
				if (err) return next(err);
				if (!profile) return next({ status: 401, message: "Facebook authentication failed" });

				try {
					const email = profile.emails?.[0]?.value;
					if (!email) return next({ status: 400, message: "No email from Facebook profile" });

					let roleRedirectURL: string | undefined;
					let status: "registered" | "authenticated";
					const AuthenticatedUser = req.app.locals.AuthenticatedUser;
					let user = await AuthenticatedUser.findOne({ email });

					if (user) {
						// Sign in
						if (!user.social.facebook || Object.keys(user.social.facebook).length === 0) {
							user.social.facebook = {
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
								facebook: {
									id: profile.id,
									displayName: profile.displayName,
								},
							},
						});

						status = "registered";

						if (this.inducedAuthConfig.auth.rbac.enabled) {
							if (!this.inducedAuthConfig.auth.methods.social?.facebook?.roleRedirectURL) {
								return next({
									status: 400,
									message: "RBAC is enabled but roleRedirectURL is not set for Facebook auth",
								});
							}

							// @ts-ignore
							req.session.pendingUser = {
								id: user._id,
							};
							roleRedirectURL =
								typeof this.inducedAuthConfig.auth.methods.social?.facebook?.roleRedirectURL ===
								"string"
									? this.inducedAuthConfig.auth.methods.social?.facebook?.roleRedirectURL
									: this.inducedAuthConfig.auth.methods.social?.facebook?.roleRedirectURL?.[
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

		if (!this.facebookAuthConfig || !this.facebookAuthConfig.enabled)
			return next({ status: 500, message: "Facebook auth not enabled" });
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

export default FacebookAuth;
