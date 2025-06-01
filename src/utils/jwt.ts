import jwt, { SignOptions, VerifyOptions, JwtPayload } from "jsonwebtoken";

// Sign a JWT
export async function signJWT(
	payload: object,
	secret: string,
	options?: SignOptions
): Promise<string> {
	return new Promise((resolve, reject) => {
		jwt.sign(payload, secret, options || {}, (err: Error | null, token?: string) => {
			if (err || !token) return reject(err);
			resolve(token);
		});
	});
}

// Verify a JWT
export async function verifyJWT(
	token: string,
	secret: string,
	options?: VerifyOptions
): Promise<JwtPayload | string> {
	return new Promise((resolve, reject) => {
		jwt.verify(
			token,
			secret,
			options || {},
			(err: jwt.VerifyErrors | null, decoded?: object | string) => {
				if (err) return reject(err);
				resolve(decoded!);
			}
		);
	});
}

// Decode a JWT (no verification)
export function decodeJWT(token: string): null | { [key: string]: any } | string {
	return jwt.decode(token);
}
