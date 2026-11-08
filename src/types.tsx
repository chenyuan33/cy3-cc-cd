import type { Context } from "hono";
import type { supportedLanguagesShortCodeType } from "./i18n";
export type userInfo = {
	id: number,
	name: string,
	created_at: string,
	username_violation: number,
	name_color_light: string,
	name_color_dark: string,
	permission: number,
	tag: string | null
};
export type themeBasicInfo = {
	usebgimage: number | boolean, useFrostedGlass: string | number | boolean, editor: string,
	bgImageRepeatX: string | number | boolean, bgImageRepeatY: string | number | boolean,
	bgImageSizeX: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeXCustom: number | string, bgImageSizeXCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	bgImageSizeY: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeYCustom: number | string, bgImageSizeYCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	light_fgcolor: string, light_bgcolor: string, light_bgimage: string,
	dark_fgcolor: string, dark_bgcolor: string, dark_bgimage: string
};
export type themeInfo = themeBasicInfo & {
	id: number,
	user: userInfo,
	name: string,
	created_at: string,
	updated_at: string,
	number_of_users: number
};
export type judgementType = 'permission-changed' | 'name-violation' | 'warn';
export type judgementInfo = {
	id: number,
	user: userInfo,
	type: judgementType,
	payload: any,
	created_at: string,
	batch_id: string,
	operator: userInfo,
	comment: string
};
export type AppEnv = {
	Bindings: Cloudflare.Env,
	Variables: {
		reqBody: Record<string, string>;
		shortLocale: supportedLanguagesShortCodeType;
		currentUser: userInfo | null;
		currentUserEmail: string | null;
		usingTheme: themeBasicInfo;
	}
};
export type ContextType = Context<AppEnv, any, {}>;