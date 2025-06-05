import { AuthConfig } from "../../../../config/types";
import AuthAPI from "../../../../api";
import { WorkOS } from "@workos-inc/node";
import JWTDelivery from "../../../delivery/jwt";
import type { NextFunction, Request, Response } from "express";

class Password {
	private workos: WorkOS;
	private authAPI: AuthAPI;
	private config: AuthConfig;

	constructor(config: AuthConfig, authAPI: AuthAPI, workos: WorkOS) {
		this.config = config;
		this.workos = workos;
		this.authAPI = authAPI;
	}

	public async signup(req: Request, res: Response, next: NextFunction) {
		try {
			const { email, password, role } = req.body;

			// Validation
			if (!this.config.workos.signupEnabled) {
				next({
					status: 403,
					message: "Signup is disabled. Please contact the administrator to get access.",
				});
				return;
			}
			if (this.config.workos.rbac.enabled) {
				if (!role) {
					next({ status: 400, message: "Role is required for RBAC" });
					return;
				}
				if (!this.config.workos.rbac.roles!.find((r) => r.name === role)) {
					next({ status: 400, message: "This role is not allowed for RBAC" });
					return;
				}
			}

			// Extract Role Data
			const roleData = this.config.workos.rbac.enabled
				? this.config.workos.rbac.roles!.find((r) => r.name === role)
				: { name: "user", permissions: [] };

			// Create user in WorkOS
			const { user, sealedSession } = await this.workos.userManagement.authenticateWithPassword({
				email,
				password,
				clientId: this.config.workos.clientId[this.config.workos.env] as string,
				session: {
					sealSession: true,
					cookiePassword: this.config.workos.delivery.jwt.secret || "secret",
				},
			});

			// Extract Session ID
			const { sessionId } = (await this.workos.userManagement.authenticateWithSessionCookie({
				sessionData: sealedSession!,
				cookiePassword: this.config.workos.delivery.jwt.secret || "secret",
			})) as any;

			// Create User
			const newUser = await this.authAPI.user().create({
				email: user.email,
				last_name: user.lastName || "",
				first_name: user.firstName || "",
			});

			// Get Project
			const projectData = await this.authAPI.project().getAll(1, 1, {
				name: this.config.projectName,
			});

			// Create UserProjectRelation
			const newUserProjectRelation = await this.authAPI.userProjectRelation().create({
				role: roleData!,
				workos_user_id: user.id,
				session_ids: [sessionId],
				user_id: newUser.data.user.id,
				project_id: projectData.data.projects[0].id,
			});

			const jwt = new JWTDelivery(this.config.workos.delivery.jwt);
			const { token, res: jwtRes } = await jwt.signToken(
				{ up_id: newUserProjectRelation.data.userProjectRelation.id, session_id: sessionId },
				res
			);
			res = jwtRes;
			res.locals.auth = {
				token: token,
				session: sessionId,
			};

			next();
		} catch (error: any) {
			next({ status: 400, message: error.message });
		}
	}

	public async signin(req: Request, res: Response, next: NextFunction) {
		try {
			const { email, password } = req.body;

			// Authenticate with WorkOS
			const { user, sealedSession } = await this.workos.userManagement.authenticateWithPassword({
				email,
				password,
				clientId: this.config.workos.clientId[this.config.workos.env] as string,
				session: {
					sealSession: true,
					cookiePassword: this.config.workos.delivery.jwt.secret || "secret",
				},
			});

			// Extract Session ID
			const { sessionId } = (await this.workos.userManagement.authenticateWithSessionCookie({
				sessionData: sealedSession!,
				cookiePassword: this.config.workos.delivery.jwt.secret || "secret",
			})) as any;

			// Get User
			const userData = await this.authAPI.user().getAll(1, 1, {
				email: user.email,
			});
			if (!userData.success || userData.data.users.length === 0) {
				next({ status: 404, message: "User not found" });
				return;
			}

			// Get Project
			const projectData = await this.authAPI.project().getAll(1, 1, {
				name: this.config.projectName,
			});

			// Get UserProjectRelation
			const userProjectRelation = await this.authAPI.userProjectRelation().getAll(1, 1, {
				user_id: userData.data.users[0].id,
				project_id: projectData.data.projects[0].id,
			});
			if (
				!userProjectRelation.success ||
				userProjectRelation.data.userProjectRelations.length === 0
			) {
				next({ status: 404, message: "User not found in project" });
				return;
			}

			// Update UserProjectRelation
			await this.authAPI
				.userProjectRelation()
				.update(userProjectRelation.data.userProjectRelations[0].id, {
					session_ids: [...userProjectRelation.data.userProjectRelations[0].session_ids, sessionId],
				});

			const jwt = new JWTDelivery(this.config.workos.delivery.jwt);
			const { token, res: jwtRes } = await jwt.signToken(
				{ up_id: userProjectRelation.data.userProjectRelations[0].id, session_id: sessionId },
				res
			);
			res = jwtRes;
			res.locals.auth = {
				token: token,
				session: sessionId,
			};

			next();
		} catch (error: any) {
			next({ status: 401, message: "Invalid credentials" });
		}
	}

	public async validate(req: Request, res: Response, next: NextFunction) {
		const jwt = new JWTDelivery(this.config.workos.delivery.jwt);
		const { isValid, decoded } = (await jwt.verifyToken(req)) as {
			isValid: boolean;
			decoded: { up_id: string; session_id: string } | null;
		};
		if (!isValid) {
			next({ status: 401, message: "Unauthorized" });
		}

		res.locals.auth = {
			session: decoded?.session_id,
			userProjectRelation: decoded?.up_id,
		};

		next();
	}

	public async logout(req: Request, res: Response, next: NextFunction) {
		const { session } = res.locals.auth;

		res.locals.logoutURL = await this.workos.userManagement.getLogoutUrl({
			sessionId: session,
		});

		next();
	}
}

export default Password;
