import type { FC } from "hono/jsx";
import type { ContextType } from "../types";
import { enableEmailVerify, permissionSpeak } from "../settings";
import { raw } from "hono/html";
import { getText } from "../translations";

const _SpeakButton: FC<{
	c: ContextType,
	type: 'button' | 'submit',
	text: 'post' | 'reply',
	onclick: string | undefined
}> = ({ c, type, text, onclick }) => <button
	type={type}
	onclick={onclick}
	disabled={!c.get('currentUser') || enableEmailVerify && !c.get('currentUserEmail') || !(c.get('currentUser')!.permission & permissionSpeak)}
>{raw(getText(c.get('locale'),
	c.get('currentUser') && !(c.get('currentUser')!.permission & permissionSpeak)
	? 'muted'
	: text + (c.get('currentUser') ? '' : 'AfterLogin') + (c.get('currentUser') && enableEmailVerify && !c.get('currentUserEmail') ? 'AfterEmailVerify' : '')))
}</button>;
const _SpeakButtonOrLink: FC<{
	c: ContextType,
	text: 'post' | 'reply',
	onclick: string | undefined,
	href?: string | undefined
}> = ({ c, text, href, onclick }) => href && c.get('currentUser') && (!enableEmailVerify || c.get('currentUserEmail')) && (c.get('currentUser')!.permission & permissionSpeak)
	? <a href={href}><_SpeakButton c={c} type='button' text={text} onclick={onclick} /></a>
	: <_SpeakButton c={c} type='submit' text={text} onclick={onclick} />;
export const PostButton: FC<{ c: ContextType, onclick?: string, href?: string }> = ({ c, onclick, href }) => <_SpeakButtonOrLink c={c} onclick={onclick} href={href} text='post' />;
export const ReplyButton: FC<{ c: ContextType, onclick?: string, href?: string }> = ({ c, onclick, href }) => <_SpeakButtonOrLink c={c} onclick={onclick} href={href} text='reply' />;
export const DeleteButton: FC<{ c: ContextType, href: string, arg: Object, redirect: string }> = ({ c, href, arg, redirect }) => <button class='dangerousButton' onclick={`(async () => (await createConfirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('${href}', { method: 'POST', body: '${JSON.stringify(arg)}', headers: { 'Content-Type': 'application/json' } }).then(() => location.href='${redirect}')) : undefined))()`}>{getText(c.get('locale'), 'delete')}</button>;
export const DeleteLink: FC<{ c: ContextType, href: string, arg: Object, redirect: string }> = ({ c, href, arg, redirect }) => <a class='dangerousLink' href='javascript:void(0)' onclick={`(async () => (await createConfirm('${getText(c.get('locale'), 'deleteConfirm')}') ? (fetch('${href}', { method: 'POST', body: '${JSON.stringify(arg)}', headers: { 'Content-Type': 'application/json' } }).then(() => location.href='${redirect}')) : undefined))()`}>{getText(c.get('locale'), 'delete')}</a>;