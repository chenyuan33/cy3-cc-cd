import type { StatusCode } from "hono/utils/http-status";
import type { ContextType } from "../types";
import { getText } from "../translations";
import { raw } from "hono/html";
import { Card } from "../components/card";
export const errorHTML = (c: ContextType, err: Error | string, status: StatusCode = 400) => {
	c.status(status);
	return c.render(
		<Card>
			<h1>{getText(c.get('locale'), 'somethingWentWrong')}</h1>
			<p>{err instanceof Error ? err.message : err}</p>
		</Card>,
		{ title: getText(c.get('locale'), 'somethingWentWrong') }
	);
};
export const notFound = (c: ContextType) => errorHTML(c, getText(c.get('locale'), 'notFound'), 404);
export const accessDenied = (c: ContextType) => errorHTML(c, getText(c.get('locale'), 'accessDenied'), 403);
export const loginRequired = (c: ContextType) => errorHTML(c, raw(getText(c.get('locale'), 'loginRequired')), 403);
export const emailVerifyRequired = (c: ContextType) => errorHTML(c, raw(getText(c.get('locale'), 'emailVerifyRequired')), 403);
export const banned = (c: ContextType) => errorHTML(c, raw(getText(c.get('locale'), 'banned')), 403);
export const muted = (c: ContextType) => errorHTML(c, raw(getText(c.get('locale'), 'muted')), 403);