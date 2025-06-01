import { InducedAuthConfig } from "../../config/types";

import JWTDelivery from "../delivery/jwt";
import ApiKeyDelivery from "../delivery/apiKey";
import { Request, Response, NextFunction } from "express";
import { hashPassword, comparePassword } from "../../utils/hash";

class BasicAuth {
	private config: InducedAuthConfig;

	constructor(config: InducedAuthConfig) {
		this.config = config;
	}

	signUpRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password, role } = req.body;

			// Validation
			if (!email || !password) {
				return next({ status: 400, message: "Email and Password are required." });
			}
			if (this.config.auth.rbac.enabled) {
				if (!role) {
					return next({ status: 400, message: "Role is required." });
				}
				if (!this.config.auth.rbac.roles?.includes(role)) {
					return next({ status: 400, message: "Not a valid role." });
				}
			}

			const AuthenticatedUser = req.app.locals.AuthenticatedUser;
			const existing = await AuthenticatedUser.findOne({ email });
			if (existing) {
				// Duplicate user check
				if (Object.keys(existing.social).length === 0) {
					return next({ status: 409, message: "Email already registered." });
				}
				// Role mismatch check
				if (this.config.auth.rbac.enabled && existing.role !== role) {
					return next({
						status: 409,
						message: "Email already registered with a different role.",
					});
				}
			}

			// Hash password
			const passwordHash = await hashPassword(password);

			// Generate user
			const generatedUser = await AuthenticatedUser.create({
				email,
				passwordHash,
				role: this.config.auth.rbac.enabled ? role : "user",
			});
			res.locals.auth = {
				user: generatedUser,
				status: "registered",
				role: generatedUser.role,
			};

			// Delivery
			// JWT
			if (this.config.auth.delivery.jwt.enabled) {
				const jwt = new JWTDelivery(this.config.auth.delivery.jwt);
				const { token, res: jwtRes } = await jwt.signToken(
					{
						id: generatedUser._id,
						role: generatedUser.role,
					},
					res
				);
				res = jwtRes;

				if (this.config.auth.delivery.jwt.sendVia?.includes("header")) {
					res.locals.auth.token = {
						token,
						expiresIn: this.config.auth.delivery.jwt.expiresIn,
					};
				}
			}
			// API Key
			if (this.config.auth.delivery.apiKey.enabled) {
				res.locals.auth.apiKey = this.config.auth.delivery.apiKey.apiKeyValue;
			}

			next();
		} catch (err) {
			next(err);
		}
	};

	signInRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { email, password } = req.body;

			// Validation
			if (!email || !password) {
				return next({ status: 400, message: "Email and password are required." });
			}

			// User check
			const AuthenticatedUser = req.app.locals.AuthenticatedUser;
			const user = await AuthenticatedUser.findOne({ email });
			if (!user) {
				return next({ status: 401, message: "Invalid Email or Password." });
			}

			// Password check
			const valid = await comparePassword(password, user.passwordHash);
			if (!valid) {
				return next({ status: 401, message: "Invalid Email or Password." });
			}
			res.locals.auth = {
				user,
				role: user.role,
				status: "authenticated",
			};

			// Delivery
			// JWT
			if (this.config.auth.delivery.jwt.enabled) {
				const jwt = new JWTDelivery(this.config.auth.delivery.jwt);
				const { token, res: jwtRes } = await jwt.signToken(
					{
						id: user._id,
						role: user.role,
					},
					res
				);
				res = jwtRes;

				if (this.config.auth.delivery.jwt.sendVia?.includes("header")) {
					res.locals.auth.token = {
						token,
						expiresIn: this.config.auth.delivery.jwt.expiresIn,
					};
				}
			}
			// API Key
			if (this.config.auth.delivery.apiKey.enabled) {
				res.locals.auth.apiKey = this.config.auth.delivery.apiKey.apiKeyValue;
			}

			next();
		} catch (err) {
			next(err);
		}
	};

	secureRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		try {
			res.locals.auth = {
				role: null,
				status: "unauthenticated",
			};

			// Delivery
			// JWT
			if (this.config.auth.delivery.jwt.enabled) {
				const jwt = new JWTDelivery(this.config.auth.delivery.jwt);
				const { isValid, decoded } = (await jwt.verifyToken(req)) as {
					isValid: boolean;
					decoded: { role: string; id: string };
				};

				if (!isValid) {
					return next({ status: 401, message: "Unauthorized" });
				} else {
					res.locals.auth = {
						role: decoded?.role,
						status: "authenticated",
					};
				}
			}
			// API Key
			if (this.config.auth.delivery.apiKey.enabled) {
				const apiKey = new ApiKeyDelivery(this.config.auth.delivery.apiKey);
				const isValid = await apiKey.verifyAPIKey(req);

				if (!isValid) {
					return next({ status: 401, message: "Unauthorized - Invalid API Key" });
				} else {
					if (this.config.auth.rbac.enabled && !req.headers["x-api-role"]) {
						return next({ status: 401, message: "Unauthorized - No role provided" });
					} else {
						res.locals.auth = {
							status: "authenticated",
							role: req.headers["x-api-role"],
						};
					}
				}
			}

			next();
		} catch (err) {
			next(err);
		}
	};

	signOutRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		const { status } = res.locals.auth;

		if (status !== "authenticated") {
			return next({ status: 401, message: "User is not authenticated" });
		}

		// Delivery
		// JWT
		if (this.config.auth.delivery.jwt.enabled) {
			const jwt = new JWTDelivery(this.config.auth.delivery.jwt);
			jwt.revokeToken(res);
		}
		// API Key
		if (this.config.auth.delivery.apiKey.enabled) {
			return next({ status: 401, message: "Clear API Key from headers" });
		}

		next();
	};

	resetPasswordRouteMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		next();
	};
}

export default BasicAuth;
