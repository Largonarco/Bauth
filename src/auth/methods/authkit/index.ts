import AuthAPI from "../../../api";
import { WorkOS } from "@workos-inc/node";
import JWTDelivery from "../../delivery/jwt";

import { AuthConfig } from "../../../config/types";
import type { Request, Response, NextFunction } from "express";

class AuthKit {
	private workos: WorkOS;
	private authAPI: AuthAPI;
	private config: AuthConfig;

	constructor(config: AuthConfig, authAPI: AuthAPI) {
		this.config = config;
		this.authAPI = authAPI;
		this.workos = new WorkOS(config.workos.clientSecret[config.workos.env]);
	}

	public async prompt(req: Request, res: Response, next: NextFunction) {
		const { role } = req.body;

		// Validation
		if (this.config.workos.rbac.enabled) {
			if (!role) {
				next({ status: 400, message: "Role is required for RBAC" });
			}
			if (!this.config.workos.rbac.roles!.find((r) => r.name === role)) {
				next({ status: 400, message: "This role is not allowed for RBAC" });
			}
		}

		// Get AuthURL
		const authURL = await this.workos.userManagement.getAuthorizationUrl({
			provider: "authkit",
			clientId: this.config.workos.clientId[this.config.workos.env] as string,
			state: JSON.stringify({ project: this.config.projectName, role: req.body.role }),
			redirectUri: this.config.workos.authkit.redirectURL[this.config.workos.env] as string,
		});

		// Could also directly send the authURL to the client
		res.locals.authURL = authURL;

		next();
	}

	public async callback(req: Request, res: Response, next: NextFunction) {
		let userProjectRelationData: any;
		const { code, state } = req.query;
		const { projectName, role } = JSON.parse(state as string);

		const { user, accessToken } = await this.workos.userManagement.authenticateWithCode({
			code: code as string,
			clientId: this.config.workos.clientId[this.config.workos.env] as string,
		});

		// Extract Session ID
		const tokenParts = accessToken.split(".");
		const claims = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
		const sessionId = claims.sid;

		// Extract Role Data
		const roleData = this.config.workos.rbac.enabled
			? this.config.workos.rbac.roles!.find((r) => r.name === role)
			: { name: "user", permissions: [] };

		// Fetch User and Project
		let userData = await this.authAPI.user().getAll(1, 1, {
			email: user.email,
		});
		let projectData = await this.authAPI.project().getAll(1, 1, {
			name: projectName,
		});

		if (userData.success) {
			// Signup flow
			if (userData.data.users.length === 0) {
				// Signup disabled, early return
				if (!this.config.workos.signupEnabled) {
					next({
						status: 403,
						message: "Signup is disabled. Please contact the administrator to get access.",
					});
				}

				// Create new User
				const newUser = await this.authAPI.user().create({
					email: user.email,
					last_name: user.lastName || "",
					first_name: user.firstName || "",
				});

				// Create new UserProjectRelation
				const newUserProjectRelation = await this.authAPI.userProjectRelation().create({
					role: roleData!,
					workos_user_id: user.id,
					session_ids: [sessionId!],
					user_id: newUser.data.user.id,
					project_id: projectData.data.projects[0].id,
				});

				userProjectRelationData = newUserProjectRelation.data.userProjectRelation;
			} else {
				// Signin + Signup flow

				// UserProjectRelation check
				const userProjectRelation = await this.authAPI.userProjectRelation().getAll(1, 1, {
					user_id: userData.data.users[0].id,
					project_id: projectData.data.projects[0].id,
				});

				if (userProjectRelation.success) {
					// Signup flow
					if (userProjectRelation.data.userProjectRelations.length === 0) {
						// Signup disabled, early return
						if (!this.config.workos.signupEnabled) {
							next({
								status: 403,
								message: "Signup is disabled. Please contact the administrator to get access.",
							});
						}

						// Create UserProjectRelation
						const newUserProjectRelation = await this.authAPI.userProjectRelation().create({
							role: roleData!,
							workos_user_id: user.id,
							session_ids: [sessionId!],
							user_id: userData.data.users[0].id,
							project_id: projectData.data.projects[0].id,
						});

						userProjectRelationData = newUserProjectRelation.data.userProjectRelation;
					} else {
						// Signin flow
						// Update UserProjectRelation
						const updatedUserProjectRelation = await this.authAPI
							.userProjectRelation()
							.update(userProjectRelation.data.userProjectRelations[0].id, {
								session_ids: [
									...userProjectRelation.data.userProjectRelations[0].session_ids,
									sessionId!,
								],
							});

						userProjectRelationData = updatedUserProjectRelation.data.userProjectRelation;
					}
				}
			}
		}

		const jwt = new JWTDelivery(this.config.workos.delivery.jwt);
		const { token, res: jwtRes } = await jwt.signToken(
			{ up_id: userProjectRelationData.id, session_id: sessionId },
			res
		);
		res = jwtRes;
		res.locals.auth = {
			token: token,
			session: sessionId,
		};

		next();
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
			returnTo: this.config.workos.authkit.logoutURL[this.config.workos.env] as string,
		});

		next();
	}
}

export default AuthKit;
