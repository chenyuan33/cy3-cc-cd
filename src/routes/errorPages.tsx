import type { StatusCode } from "hono/utils/http-status";
import type { ContextType } from "../types";
import { raw } from "hono/html";
import { Card } from "../components/card";
export const errorHTML = (c: ContextType, err: Error | string, status: StatusCode = 400) => {
	c.status(status);
	const somethingWentWrong = c.get('translations').error.somethingWentWrong;
	return c.render(
		<Card>
			<h1>{somethingWentWrong}</h1>
			<p>{err instanceof Error ? err.message : err}</p>
		</Card>,
		{ title: somethingWentWrong }
	);
};
export const notFound = (c: ContextType) => errorHTML(c, c.get('translations').error.notFound, 404);
export const accessDenied = (c: ContextType) => errorHTML(c, c.get('translations').error.accessDenied, 403);
export const verifyFailed = (c: ContextType) => errorHTML(c, c.get('translations').error.verifyFailed);
export const loginRequired = (c: ContextType) => errorHTML(c, raw(c.get('translations').error.loginRequired), 401);
export const emailVerifyRequired = (c: ContextType) => errorHTML(c, raw(c.get('translations').error.emailVerifyRequired), 401);
export const banned = (c: ContextType) => errorHTML(c, raw(c.get('translations').error.banned), 403);
export const muted = (c: ContextType) => errorHTML(c, raw(c.get('translations').error.muted), 403);
export const alreadyLoggedIn = (c: ContextType) => errorHTML(c, c.get('translations').error.alreadyLoggedIn);
export const usernameRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.usernameRequired);
export const registerUsernameLength = (c: ContextType) => errorHTML(c, c.get('translations').user.registerUsernameLength);
export const registerUsernameExists = (c: ContextType) => errorHTML(c, c.get('translations').user.registerUsernameExists);
export const emailRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.emailRequired);
export const passwordRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.passwordRequired);
export const noSuchUsername = (c: ContextType) => errorHTML(c, c.get('translations').error.noSuchUsername, 401);
export const invalidPassword = (c: ContextType) => errorHTML(c, c.get('translations').error.invalidPassword, 401);
export const invalidEmail = (c: ContextType) => errorHTML(c, c.get('translations').error.invalidEmail, 401);
export const emailUsed = (c: ContextType) => errorHTML(c, c.get('translations').error.emailUsed);
export const titleRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.titleRequired);
export const contentRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.contentRequired);
export const categoryRequired = (c: ContextType) => errorHTML(c, c.get('translations').error.categoryRequired);
export const categoryNotFound = (c: ContextType) => errorHTML(c, c.get('translations').error.categoryNotFound);