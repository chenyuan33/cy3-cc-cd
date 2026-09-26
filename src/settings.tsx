export const enableEmailVerify = false;
export const permissionCount = 5;
export const permissionVisit = 1 as const;
export const permissionSpeak = 2 as const;
export const permissionAdmin = 4 as const;
export const permissionChat = 8 as const;
export const permissionFile = 16 as const;
export type allPermissions =
	| typeof permissionVisit
	| typeof permissionSpeak
	| typeof permissionAdmin
	| typeof permissionChat
	| typeof permissionFile;
export const timeLimitDefault = 1000;
export const timeLimitMax = 5000;
export const memoryLimitDefault = 512;
export const memoryLimitMax = 1024;