import mongoose, { Schema } from "mongoose";
import { Profile } from "passport-github2";

// Interface
export interface AuthenticatedUser {
	email: string;
	role?: string;
	createdAt?: Date;
	updatedAt?: Date;
	passwordHash: string;
	_id?: mongoose.Types.ObjectId;
	social?: {
		google?: Profile;
		github?: Profile;
		twitter?: Profile;
		linkedin?: Profile;
		facebook?: Profile;
	};
}

// Schema
export const AuthenticatedUserSchema = new Schema<AuthenticatedUser>(
	{
		role: { type: String, default: "user" },
		email: { type: String, required: true },
		passwordHash: { type: String, required: true },
		social: {
			type: Object,
			required: false,
		},
	},
	{ timestamps: true }
);
