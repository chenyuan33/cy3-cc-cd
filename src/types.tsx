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
export type AppEnv = {
	Variables: {
		reqBody: Record<string, string>;
		shortLocale: supportedLanguagesShortCodeType;
		locale: supportedLanguagesType;
		translations: typeof en_us;
		currentUser: userInfo | null;
		currentUserEmail: string | null;
	}
};
export type ContextType = Context<AppEnv, any, {}>;