import type { FC } from "hono/jsx";
import { enableEmailVerify, permissionSpeak } from "../../settings";
import { t, tString } from "../i18n";
import { useCurrentUser, useCurrentUserEmail } from "../utils/currentUser";
import { createConfirm } from "./dialog";
import { navigate } from "@w3cj/ruta";
import { A } from "./a";
import type { JSX } from "hono/jsx/jsx-runtime";

const _SpeakButton: FC<{
	type: 'button' | 'submit',
	text: 'post' | 'reply',
	onClick?: ((event: MouseEvent) => void) | undefined
}> = ({ type, text, onClick = () => {} }) => {
	const currentUser = useCurrentUser(), currentUserEmail = useCurrentUserEmail();
	let buttonContent = <></>;
	if (currentUser && !(currentUser!.permission & permissionSpeak)) {
		buttonContent = t('error.muted');
	} else if (!currentUser) {
		buttonContent = t(`${text}AfterLogin`, { link: <A href='/user/login'>{t('afterLoginLink')}</A> });
	} else if (currentUser && enableEmailVerify && !currentUserEmail) {
		buttonContent = t(`${text}AfterEmailVerify`, { link: <A href='/user/settings'>{t('afterEmailVerifyLink')}</A> });
	} else {
		buttonContent = t(text);
	}
	return <button
		type={type}
		onClick={onClick}
		disabled={!currentUser || enableEmailVerify && !currentUserEmail || !(currentUser!.permission & permissionSpeak)}
	>{buttonContent}</button>;
};
const _SpeakButtonOrLink: FC<{
	text: 'post' | 'reply',
	onClick?: ((event: MouseEvent) => void) | undefined,
	href?: string | undefined
}> = ({ text, href, onClick }) => href && useCurrentUser() && (!enableEmailVerify || useCurrentUserEmail()) && (useCurrentUser()!.permission & permissionSpeak)
	? <A href={href}><_SpeakButton type='button' text={text} onClick={onClick} /></A>
	: <_SpeakButton type='submit' text={text} onClick={onClick} />;
export const PostButton: FC<{ onClick?: ((event: MouseEvent) => void) | undefined, href?: string }> = ({ onClick, href }) => <_SpeakButtonOrLink onClick={onClick} href={href} text='post' />;
export const ReplyButton: FC<{ onClick?: ((event: MouseEvent) => void) | undefined, href?: string }> = ({ onClick, href }) => <_SpeakButtonOrLink onClick={onClick} href={href} text='reply' />;
export const DeleteButton: FC<{ href: string, arg?: Object, redirect: string, onSuccess?: () => void }> = ({ href, arg, redirect, onSuccess }) => <button class='dangerousButton' onClick={async () => {
	if (await createConfirm(tString('deleteConfirm'))) {
		await fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } });
		const url = new URL(redirect, location.href);
		navigate(url.pathname + url.search);
		onSuccess?.();
	}
}}>{t('delete')}</button>;
export const FetchButton: FC<{ href: string, arg?: Object, redirect: string, text: string | JSX.Element, onSuccess?: () => void }> = ({ href, arg, redirect, text, onSuccess }) => <button onClick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(() => { navigate(redirect); onSuccess?.(); })}>{text}</button>;
export const FetchLink: FC<{ href: string, arg?: Object, redirect: string, text: string | JSX.Element, onSuccess?: () => void }> = ({ href, arg, redirect, text, onSuccess }) => <a href='javascript:void(0)' onClick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(() => { navigate(redirect); onSuccess?.(); })}>{text}</a>;
export const FetchJsonButton: FC<{ href: string, arg?: Object, redirect: string, text: string | JSX.Element, onSuccess?: (data: any) => void }> = ({ href, arg, redirect, text, onSuccess }) => <button onClick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(x => x.json()).then(x => { navigate(redirect); onSuccess?.(x); })}>{text}</button>;
export const FetchJsonLink: FC<{ href: string, arg?: Object, redirect: string, text: string | JSX.Element, onSuccess?: (data: any) => void }> = ({ href, arg, redirect, text, onSuccess }) => <a href='javascript:void(0)' onClick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(x => x.json()).then(x => { navigate(redirect); onSuccess?.(x); })}>{text}</a>;
export const DeleteLink: FC<{ href: string, arg?: Object, redirect: string, onSuccess?: () => void }> = ({ href, arg, redirect, onSuccess }) => <a class='dangerousLink' href='javascript:void(0)' onClick={async () => {
	if (await createConfirm(tString('deleteConfirm'))) {
		fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } });
		const url = new URL(redirect, location.href);
		navigate(url.pathname + url.search);
		onSuccess?.();
	}
}}>{t('delete')}</a>;