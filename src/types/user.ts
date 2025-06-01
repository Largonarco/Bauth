export interface User {
	_id?: string;
	email: string;
	passwordHash: string;
	roles?: string[];
	createdAt?: Date;
	updatedAt?: Date;
	// Add more fields as needed
}
