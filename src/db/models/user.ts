import mongoose, { Schema } from "mongoose";

// Interface
export interface AuthenticatedUser {
	email: string;
	role?: string;
	createdAt?: Date;
	updatedAt?: Date;
	passwordHash: string;
	_id?: mongoose.Types.ObjectId;
	social?: {
		google?: {
			id: string;
			displayName: string;
		};
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
