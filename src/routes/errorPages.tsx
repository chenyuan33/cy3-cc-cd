import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ContextType } from "../types";
import { raw } from "hono/html";
import { getI18n } from "../i18n";
export const errorJson = (c: ContextType, err: Error | string, status: ContentfulStatusCode = 400) => {
	c.status(status);
	return c.json({
		success: false,
		message: err instanceof Error ? err.message : err
	}, status);
};
export const notFound = (c: ContextType) => errorJson(c, getI18n(c)('error.notFound'), 404);
export const missingParams = (c: ContextType) => errorJson(c, getI18n(c)('error.missingParams'));
export const accessDenied = (c: ContextType) => errorJson(c, getI18n(c)('error.accessDenied'), 403);
export const verifyFailed = (c: ContextType) => errorJson(c, getI18n(c)('error.verifyFailed'));
export const loginRequired = (c: ContextType) => errorJson(c, raw(getI18n(c)('error.loginRequired')), 401);
export const emailVerifyRequired = (c: ContextType) => errorJson(c, raw(getI18n(c)('error.emailVerifyRequired')), 401);
export const banned = (c: ContextType) => errorJson(c, raw(getI18n(c)('error.banned')), 403);
export const muted = (c: ContextType) => errorJson(c, raw(getI18n(c)('error.muted')), 403);
export const alreadyLoggedIn = (c: ContextType) => errorJson(c, getI18n(c)('error.alreadyLoggedIn'));
export const usernameRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.usernameRequired'));
export const registerUsernameLength = (c: ContextType) => errorJson(c, getI18n(c)('user.registerUsernameLength'));
export const registerUsernameExists = (c: ContextType) => errorJson(c, getI18n(c)('user.registerUsernameExists'));
export const emailRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.emailRequired'));
export const passwordRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.passwordRequired'));
export const noSuchUsername = (c: ContextType) => errorJson(c, getI18n(c)('error.noSuchUsername'), 401);
export const invalidPassword = (c: ContextType) => errorJson(c, getI18n(c)('error.invalidPassword'), 401);
export const invalidEmail = (c: ContextType) => errorJson(c, getI18n(c)('error.invalidEmail'), 401);
export const emailUsed = (c: ContextType) => errorJson(c, getI18n(c)('error.emailUsed'));
export const titleRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.titleRequired'));
export const contentRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.contentRequired'));
export const categoryRequired = (c: ContextType) => errorJson(c, getI18n(c)('error.categoryRequired'));
export const categoryNotFound = (c: ContextType) => errorJson(c, getI18n(c)('error.categoryNotFound'));