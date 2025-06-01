import dotenv from "dotenv";
import mongoose from "mongoose";
import { DatabaseConfig } from "../config/types";

dotenv.config();

export class Database {
	public connection: mongoose.Connection;

	constructor(config: DatabaseConfig) {
		mongoose.connect(config.mongoUrl || "");
		this.connection = mongoose.connection;

		mongoose.connection.on("error", (error) => {
			console.error(error);
		});
		mongoose.connection.once("open", () => {
			console.log("Connected to database");
		});
	}
}
