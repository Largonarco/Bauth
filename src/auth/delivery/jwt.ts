import type { Request, Response } from "express";
import { JWTDeliveryConfig } from "../../config/types";

import { signJWT, verifyJWT } from "../../utils/jwt";

class JWTDelivery {
	private config: JWTDeliveryConfig;

	constructor(jwtConfig: JWTDeliveryConfig) {
		this.config = jwtConfig;
	}

	// Sign JWT
	async signToken(payload: object, res: Response) {
		const token = await signJWT(payload, this.config.secret!, {
			expiresIn: this.config.expiresIn,
		});
		res.cookie(
			this.config.cookieOptions?.name || "auth_token",
			token,
			this.config.cookieOptions || {}
		);

		return { token, res };
	}

	async verifyToken(req: Request) {
		let token: string | undefined;

		if (this.config.sendVia?.includes("header")) {
			token = req.headers["authorization"]?.split(" ")[1];
			if (!token) {
				return { isValid: false, decoded: null };
			}
		}
		if (this.config.sendVia?.includes("cookie")) {
			token = req.cookies[this.config.cookieOptions?.name || "auth_token"];
			if (!token) {
				return { isValid: false, decoded: null };
			}
		}

		const decoded = await verifyJWT(token || "", this.config.secret!);
		if (!decoded) {
			return { isValid: false, decoded: null };
		}

		return { isValid: true, decoded };
	}

	// Revoke token by clearing cookie
	revokeToken(res: Response) {
		res.clearCookie(
			this.config.cookieOptions?.name || "auth_token",
			this.config.cookieOptions || {}
		);
	}
}

export default JWTDelivery;
