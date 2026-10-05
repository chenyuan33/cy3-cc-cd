import type { FC } from "hono/jsx";
import { enableEmailVerify, permissionSpeak } from "../../settings";
import { t, tString } from "../i18n";
import { useCurrentUser, useCurrentUserEmail } from "../currentUser";
import { createConfirm } from "./dialog";
import { navigate } from "@w3cj/ruta";

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
		buttonContent = t(`${text}AfterLogin`);
	} else if (currentUser && enableEmailVerify && !currentUserEmail) {
		buttonContent = t(`${text}AfterEmailVerify`);
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
	? <a href={href}><_SpeakButton type='button' text={text} onClick={onClick} /></a>
	: <_SpeakButton type='submit' text={text} onClick={onClick} />;
export const PostButton: FC<{ onClick?: ((event: MouseEvent) => void) | undefined, href?: string }> = ({ onClick, href }) => <_SpeakButtonOrLink onClick={onClick} href={href} text='post' />;
export const ReplyButton: FC<{ onClick?: ((event: MouseEvent) => void) | undefined, href?: string }> = ({ onClick, href }) => <_SpeakButtonOrLink onClick={onClick} href={href} text='reply' />;
export const DeleteButton: FC<{ href: string, arg?: Object, redirect: string, onSuccess?: () => void }> = ({ href, arg, redirect, onSuccess }) => <button class='dangerousButton' onClick={async () => {
	if (await createConfirm(tString('deleteConfirm'))) {
		await fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } });
		navigate(redirect);
		onSuccess?.();
	}
}}>{t('delete')}</button>;
export const FetchButton: FC<{ href: string, arg?: Object, redirect: string, text: string }> = ({ href, arg, redirect, text }) => <button onclick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(() => location.href = redirect)}>{text}</button>;
export const FetchLink: FC<{ href: string, arg?: Object, redirect: string, text: string }> = ({ href, arg, redirect, text }) => <a href='javascript:void(0)' onclick={() => fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } }).then(() => location.href = redirect)}>{text}</a>;
export const DeleteLink: FC<{ href: string, arg?: Object, redirect: string, onSuccess?: () => void }> = ({ href, arg, redirect, onSuccess }) => <a class='dangerousLink' href='javascript:void(0)' onclick={async () => {
	if (await createConfirm(tString('deleteConfirm'))) {
		fetch(href, { method: 'POST', body: arg ? JSON.stringify(arg) : '', headers: { 'Content-Type': 'application/json' } });
		navigate(redirect);
		onSuccess?.();
	}
}}>{t('delete')}</a>;