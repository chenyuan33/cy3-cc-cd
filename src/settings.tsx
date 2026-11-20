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
	usebgimage: 0, useFrostedGlass: 1, editor: 'CodeMirror',
	bgImageRepeatX: 0, bgImageRepeatY: 0,
	bgImageSizeX: 'auto', bgImageSizeXCustom: 0, bgImageSizeXCustomUnit: 'px',
	bgImageSizeY: 'auto', bgImageSizeYCustom: 0, bgImageSizeYCustomUnit: 'px',
	light_fgcolor: '#333333', light_bgcolor: '#f5f5f5', light_bgimage: '',
	dark_fgcolor: '#e0e0e0', dark_bgcolor: '#181818', dark_bgimage: ''
} as const;
export const supportedProgrammingLangs = [
	{
		"value": "python3",
		"label": "Python 3"
	},
	{
		"value": "js",
		"label": "JavaScript"
	},
	{
		"value": "cpp14",
		"label": "C++14"
	},
	{
		"value": "cpp17",
		"label": "C++17"
	},
	{
		"value": "cpp20",
		"label": "C++20"
	},
	{
		"value": "cpp23",
		"label": "C++23"
	},
	{
		"value": "cpp14-o2",
		"label": "C++14 (-O2)"
	},
	{
		"value": "cpp17-o2",
		"label": "C++17 (-O2)"
	},
	{
		"value": "cpp20-o2",
		"label": "C++20 (-O2)"
	},
	{
		"value": "cpp23-o2",
		"label": "C++23 (-O2)"
	},
	{
		"value": "c",
		"label": "C"
	}
];
export const programmingLangsToEditorLangs = {
	'python3': 'py',
	'js': 'js',
	'cpp14': 'cpp',
	'cpp17': 'cpp',
	'cpp20': 'cpp',
	'cpp23': 'cpp',
	'cpp14-o2': 'cpp',
	'cpp17-o2': 'cpp',
	'cpp20-o2': 'cpp',
	'cpp23-o2': 'cpp',
	'c': 'c'
} as const;
export const programmingLangsToDisplay = Object.fromEntries(supportedProgrammingLangs.map(({ value, label }) => [value, label]));