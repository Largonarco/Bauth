import UserAuthAPI from "./users/index.js";
import ProjectAuthAPI from "./projects/index.js";
import WorkOSConfigAuthAPI from "./workos-configs/index.js";
import UserProjectRelationAuthAPI from "./user-projects/index.js";

class AuthAPI {
	private apikey: string;

	constructor(apikey: string) {
		this.apikey = apikey;
	}

	public user() {
		const userAPI = new UserAuthAPI(this.apikey);

		return {
			get: userAPI.getUser.bind(userAPI),
			getAll: userAPI.getUsers.bind(userAPI),
			create: userAPI.createUser.bind(userAPI),
			update: userAPI.updateUser.bind(userAPI),
			delete: userAPI.deleteUser.bind(userAPI),
		};
	}

	public project() {
		const projectAPI = new ProjectAuthAPI(this.apikey);

		return {
			get: projectAPI.getProject.bind(projectAPI),
			getAll: projectAPI.getProjects.bind(projectAPI),
			create: projectAPI.createProject.bind(projectAPI),
			update: projectAPI.updateProject.bind(projectAPI),
			delete: projectAPI.deleteProject.bind(projectAPI),
		};
	}

	public userProjectRelation() {
		const userProjectRelationAPI = new UserProjectRelationAuthAPI(this.apikey);

		return {
			get: userProjectRelationAPI.getUserProjectRelation.bind(userProjectRelationAPI),
			getAll: userProjectRelationAPI.getUserProjectRelations.bind(userProjectRelationAPI),
			create: userProjectRelationAPI.createUserProjectRelation.bind(userProjectRelationAPI),
			update: userProjectRelationAPI.updateUserProjectRelation.bind(userProjectRelationAPI),
			delete: userProjectRelationAPI.deleteUserProjectRelation.bind(userProjectRelationAPI),
		};
	}

	public workosConfig() {
		const workosConfigAPI = new WorkOSConfigAuthAPI(this.apikey);

		return {
			get: workosConfigAPI.getWorkOSConfig.bind(workosConfigAPI),
			getAll: workosConfigAPI.getWorkOSConfigs.bind(workosConfigAPI),
			create: workosConfigAPI.createWorkOSConfig.bind(workosConfigAPI),
			update: workosConfigAPI.updateWorkOSConfig.bind(workosConfigAPI),
			delete: workosConfigAPI.deleteWorkOSConfig.bind(workosConfigAPI),
		};
	}
}

export default AuthAPI;
