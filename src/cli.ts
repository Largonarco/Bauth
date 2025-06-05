#!/usr/bin/env node

import AuthAPI from "./api/index.js";
import dotenv from "dotenv";
import { Command } from "commander";
import { SocialProvider } from "./config/types";
import * as readline from "readline";

dotenv.config();

// Function to prompt for API key
async function promptForApiKey(): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question("Please enter your API key: ", (apiKey) => {
			rl.close();
			resolve(apiKey);
		});
	});
}

interface ListOptions {
	page?: string;
	limit?: string;
	email?: string;
	phone?: string;
}

// User
interface UserCreateOptions {
	email: string;
	phone?: string;
	lastName: string;
	firstName: string;
}

interface UserUpdateOptions {
	email?: string;
	phone?: string;
	firstName?: string;
	lastName?: string;
}

// Project
interface ProjectCreateOptions {
	name: string;
	description?: string;
	workosConfigId: string;
	organizationName: string;
}

interface ProjectUpdateOptions {
	name?: string;
	description?: string;
	workosConfig?: string;
	organizationName?: string;
}

// UserProjectRelation
interface RelationCreateOptions {
	userId: string;
	projectId: string;
	role: {
		name: string;
		permissions: string[];
	};
}

interface RelationUpdateOptions {
	role?: {
		name: string;
		permissions: string[];
	};
}

// WorkOSConfig
interface WorkOSCreateOptions {
	metadata?: string;
	isDefault: boolean;
	inviteOnly: boolean;
	rbacEnabled: boolean;
	authkitEnabled: boolean;
	enabledAuthMethods?: string[];
	allowedSocialProviders?: SocialProvider[];
	workosClientId: {
		staging: string;
		production?: string;
	};
	workosClientSecret: {
		staging: string;
		production?: string;
	};
}

interface WorkOSUpdateOptions {
	metadata?: string;
	isDefault?: boolean;
	inviteOnly?: boolean;
	rbacEnabled?: boolean;
	workosClientId?: string;
	authkitEnabled?: boolean;
	workosClientSecret?: string;
	enabledAuthMethods?: string[];
	allowedSocialProviders?: string[];
}

const program = new Command();
let api: AuthAPI;

// Initialize API with user input
(async () => {
	const apiKey = await promptForApiKey();
	api = new AuthAPI(apiKey);

	// Users commands
	program
		.command("users")
		.description("Manage users")
		.addCommand(
			new Command("list")
				.description("List all users")
				.option("-p, --page <number>", "Page number", "1")
				.option("-l, --limit <number>", "Items per page", "10")
				.option("-e, --email <string>", "Filter by email")
				.option("-n, --phone <string>", "Filter by phone")
				.action(async (options: ListOptions) => {
					const result = await api
						.user()
						.getAll(parseInt(options.page || "1"), parseInt(options.limit || "10"), {
							email: options.email,
							phone: options.phone,
						});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("get <id>").description("Get a user by ID").action(async (id: string) => {
				const result = await api.user().get(id);
				console.log(JSON.stringify(result.data, null, 2));
			})
		)
		.addCommand(
			new Command("create")
				.description("Create a new user")
				.requiredOption("-e, --email <string>", "User email")
				.option("-p, --phone <string>", "User phone")
				.requiredOption("-f, --first-name <string>", "User first name")
				.requiredOption("-l, --last-name <string>", "User last name")
				.action(async (options: UserCreateOptions) => {
					const result = await api.user().create({
						email: options.email,
						phone: options.phone,
						first_name: options.firstName,
						last_name: options.lastName,
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("update <id>")
				.description("Update a user")
				.option("-e, --email <string>", "User email")
				.option("-p, --phone <string>", "User phone")
				.option("-f, --first-name <string>", "User first name")
				.option("-l, --last-name <string>", "User last name")
				.action(async (id: string, options: UserUpdateOptions) => {
					const result = await api.user().update(id, {
						email: options.email,
						phone: options.phone,
						first_name: options.firstName,
						last_name: options.lastName,
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("delete <id>").description("Delete a user").action(async (id: string) => {
				const result = await api.user().delete(id);
				console.log(JSON.stringify(result.data, null, 2));
			})
		);

	// Projects commands
	program
		.command("projects")
		.description("Manage projects")
		.addCommand(
			new Command("list")
				.description("List all projects")
				.option("-p, --page <number>", "Page number", "1")
				.option("-l, --limit <number>", "Items per page", "10")
				.action(async (options: ListOptions) => {
					const result = await api
						.project()
						.getAll(parseInt(options.page || "1"), parseInt(options.limit || "10"));
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("get <id>").description("Get a project by ID").action(async (id: string) => {
				const result = await api.project().get(id);
				console.log(JSON.stringify(result.data, null, 2));
			})
		)
		.addCommand(
			new Command("create")
				.description("Create a new project")
				.requiredOption("-n, --name <string>", "Project name")
				.option("-d, --description <string>", "Project description")
				.requiredOption("-w, --workos-config-id <string>", "WorkOS Config ID")
				.requiredOption("-o, --organization-name <string>", "Organization name")
				.action(async (options: ProjectCreateOptions) => {
					const result = await api.project().create({
						name: options.name,
						description: options.description,
						workos_config_id: options.workosConfigId,
						organization_name: options.organizationName,
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("update <id>")
				.description("Update a project")
				.option("-n, --name <string>", "Project name")
				.option("-d, --description <string>", "Project description")
				.option("-w, --workos-config <string>", "WorkOS Config ID")
				.option("-o, --organization-name <string>", "Organization name")
				.action(async (id: string, options: ProjectUpdateOptions) => {
					const result = await api.project().update(id, {
						name: options.name,
						description: options.description,
						workos_config: options.workosConfig,
						organization_name: options.organizationName,
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("delete <id>").description("Delete a project").action(async (id: string) => {
				const result = await api.project().delete(id);
				console.log(JSON.stringify(result.data, null, 2));
			})
		);

	// UserProjectRelation commands
	program
		.command("relations")
		.description("Manage user-project relations")
		.addCommand(
			new Command("list")
				.description("List all user-project relations")
				.option("-p, --page <number>", "Page number", "1")
				.option("-l, --limit <number>", "Items per page", "10")
				.action(async (options: ListOptions) => {
					const result = await api
						.userProjectRelation()
						.getAll(parseInt(options.page || "1"), parseInt(options.limit || "10"));
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("get <id>")
				.description("Get a user-project relation by ID")
				.action(async (id: string) => {
					const result = await api.userProjectRelation().get(id);
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("create")
				.description("Create a new user-project relation")
				.requiredOption("-u, --user-id <string>", "User ID")
				.requiredOption("-p, --project-id <string>", "Project ID")
				.requiredOption("-r, --role <string>", "User role in project")
				.action(async (options: RelationCreateOptions) => {
					const result = await api.userProjectRelation().create({
						user_id: options.userId,
						project_id: options.projectId,
						role: {
							name: options.role?.name || "user",
							permissions: options.role?.permissions || [],
						},
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("update <id>")
				.description("Update a user-project relation")
				.option("-r, --role <string>", "User role in project")
				.action(async (id: string, options: RelationUpdateOptions) => {
					const result = await api.userProjectRelation().update(id, {
						role: {
							name: options.role?.name || "user",
							permissions: options.role?.permissions || [],
						},
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("delete <id>")
				.description("Delete a user-project relation")
				.action(async (id: string) => {
					const result = await api.userProjectRelation().delete(id);
					console.log(JSON.stringify(result.data, null, 2));
				})
		);

	// WorkOSConfig commands
	program
		.command("workos")
		.description("Manage WorkOS configurations")
		.addCommand(
			new Command("list")
				.description("List all WorkOS configurations")
				.option("-p, --page <number>", "Page number", "1")
				.option("-l, --limit <number>", "Items per page", "10")
				.action(async (options: ListOptions) => {
					const result = await api
						.workosConfig()
						.getAll(parseInt(options.page || "1"), parseInt(options.limit || "10"));
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("get <id>")
				.description("Get a WorkOS configuration by ID")
				.action(async (id: string) => {
					const result = await api.workosConfig().get(id);
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("create")
				.description("Create a new WorkOS configuration")
				.requiredOption("--invite-only", "Enable invite-only mode")
				.requiredOption("--is-default", "Set as default configuration")
				.requiredOption("--rbac-enabled", "Enable RBAC")
				.requiredOption("--authkit-enabled", "Enable AuthKit")
				.option("--enabled-auth-methods <string...>", "Enabled authentication methods")
				.option("--metadata <string>", "JSON metadata")
				.option("--allowed-social-providers <string...>", "Allowed social providers")
				.requiredOption("--workos-client-id-staging <string>", "WorkOS Client ID (staging)")
				.option("--workos-client-id-production <string>", "WorkOS Client ID (production)")
				.requiredOption("--workos-client-secret-staging <string>", "WorkOS Client Secret (staging)")
				.option("--workos-client-secret-production <string>", "WorkOS Client Secret (production)")
				.action(async (options: WorkOSCreateOptions) => {
					const result = await api.workosConfig().create({
						invite_only: options.inviteOnly,
						is_default: options.isDefault,
						rbac_enabled: options.rbacEnabled,
						authkit_enabled: options.authkitEnabled,
						enabled_auth_methods: options.enabledAuthMethods,
						metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
						allowed_social_providers: options.allowedSocialProviders,
						workos_client_id: {
							staging: options.workosClientId.staging,
							production: options.workosClientId.production,
						},
						workos_client_secret: {
							staging: options.workosClientSecret.staging,
							production: options.workosClientSecret.production,
						},
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("update <id>")
				.description("Update a WorkOS configuration")
				.option("--is-default", "Set as default configuration")
				.option("--invite-only", "Enable invite-only mode")
				.option("--rbac-enabled", "Enable RBAC")
				.option("--workos-client-id <string>", "WorkOS Client ID")
				.option("--authkit-enabled", "Enable AuthKit")
				.option("--workos-client-secret <string>", "WorkOS Client Secret")
				.option("--metadata <string>", "JSON metadata")
				.option("--enabled-auth-methods <string...>", "Enabled authentication methods")
				.option("--allowed-social-providers <string...>", "Allowed social providers")
				.action(async (id: string, options: WorkOSUpdateOptions) => {
					const result = await api.workosConfig().update(id, {
						is_default: options.isDefault,
						invite_only: options.inviteOnly,
						rbac_enabled: options.rbacEnabled,
						workos_client_id: options.workosClientId,
						authkit_enabled: options.authkitEnabled,
						workos_client_secret: options.workosClientSecret,
						metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
						enabled_auth_methods: options.enabledAuthMethods,
						allowed_social_providers: options.allowedSocialProviders,
					});
					console.log(JSON.stringify(result.data, null, 2));
				})
		)
		.addCommand(
			new Command("delete <id>")
				.description("Delete a WorkOS configuration")
				.action(async (id: string) => {
					const result = await api.workosConfig().delete(id);
					console.log(JSON.stringify(result.data, null, 2));
				})
		);

	program.parse();
})();
