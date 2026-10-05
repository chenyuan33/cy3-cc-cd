import type { JSX } from "hono/jsx/jsx-runtime";
import { t } from "../i18n";

let dialogId = 0;
export const createDialog = (content: string, buttons: { text?: JSX.Element, close?: boolean, callback?: () => unknown }[]) => {
	dialogId++;
	const dialog = document.createElement('div'), dialogMain = document.createElement('div'), closeBtn = document.createElement('i'), dialogBtns = document.createElement('div');
	let resolver: (value?: unknown) => void;
	const ret = new Promise(resolve => resolver = resolve);
	dialogBtns.classList.add('dialog-buttons');
	buttons.forEach(info => {
		info.text ??= <></>;
		info.close ??= true;
		info.callback ??= () => {};
		const btn = document.createElement('button');
		btn.innerHTML = info.text.toString();
		btn.addEventListener('click', info.close ? () => {
			if (info.callback) {
				resolver(info.callback());
			}
			dialog.remove();
		} : info.callback);
		dialogBtns.append(btn);
	});
	closeBtn.classList.add('dialog-close-btn', 'fa-solid', 'fa-xmark');
	dialogMain.classList.add('dialog-main');
	dialogMain.innerHTML = `<div>${content}</div>`;
	dialogMain.append(closeBtn, dialogBtns);
	dialog.id = `dialog-${dialogId}`;
	dialog.classList.add('dialog');
	dialog.innerHTML = '<div class="dialog-bg"></div>';
	closeBtn.addEventListener('click', () => {
		dialog.remove();
		resolver();
	});
	dialog.getElementsByClassName('dialog-bg')[0]!.addEventListener('click', () => {
		dialog.remove();
		resolver();
	});
	dialog.append(dialogMain);
	document.body.append(dialog);
	return ret;
}
export const createAlert = (content: string) => createDialog(content, [{ text: t('ok') }]);
export const createConfirm = (content: string) => createDialog(content, [{ text: t('cancel'), callback: () => false }, { text: t('ok'), callback: () => true }]);