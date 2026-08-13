import type { Context } from "hono";
export type userInfo = {
	id: number,
	name: string,
	created_at: string,
	username_violation: number,
	name_color_light: string,
	name_color_dark: string,
	permission: number
};
export type AppEnv = {
	Variables: {
		reqBody: Record<string, string>;
		locale: string;
		currentUser: userInfo | null;
		currentUserEmail: string | null;
	}
};
export type ContextType = Context<AppEnv, any, {}>;