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
export const defaultTheme = {
	usebgimage: 0, useFrostedGlass: 1,
	bgImageRepeatX: 0, bgImageRepeatY: 0,
	bgImageSizeX: 'auto', bgImageSizeXCustom: 0, bgImageSizeXCustomUnit: 'px',
	bgImageSizeY: 'auto', bgImageSizeYCustom: 0, bgImageSizeYCustomUnit: 'px',
	light_fgcolor: '#333333', light_bgcolor: '#f5f5f5', light_bgimage: '',
	dark_fgcolor: '#e0e0e0', dark_bgcolor: '#181818', dark_bgimage: ''
};