import type { Context } from "hono";
import type en_us from "./translations/en_us";
import type { supportedLanguagesShortCodeType, supportedLanguagesType } from "./translations";
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
export type themeInfo = {
	usebgimage: number | boolean, useFrostedGlass: number | boolean, editor: string,
	bgImageRepeatX: number | boolean, bgImageRepeatY: number | boolean,
	bgImageSizeX: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeXCustom: number, bgImageSizeXCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	bgImageSizeY: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeYCustom: number, bgImageSizeYCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	light_fgcolor: string, light_bgcolor: string, light_bgimage: string,
	dark_fgcolor: string, dark_bgcolor: string, dark_bgimage: string
};
export type AppEnv = {
	Variables: {
		reqBody: Record<string, string>;
		shortLocale: supportedLanguagesShortCodeType;
		locale: supportedLanguagesType;
		translations: typeof en_us;
		currentUser: userInfo | null;
		currentUserEmail: string | null;
		usingTheme: themeInfo;
	}
};
export type ContextType = Context<AppEnv, any, {}>;