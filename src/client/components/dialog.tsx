import type { JSX } from "hono/jsx/jsx-runtime";
import { t } from "../i18n";
import { render } from "hono/jsx/dom";

export const createDialog = (content: string | JSX.Element, buttons: { text?: string | JSX.Element, close?: boolean, callback?: () => unknown }[]) => new Promise(resolve => {
	const container = document.createElement('div');
	const close = (result?: unknown) => {
		render(null, container);
		container.remove();
		resolve(result);
	};
	document.body.appendChild(container);
	render(<div class='dialog'>
		<div class='dialog-bg' onClick={() => close()}></div>
		<div class='dialog-main'>
			{content}
			<i class='dialog-close-btn fa-solid fa-xmark' onClick={() => close()}></i>
			<div class='dialog-buttons'>{buttons.map((info, key) => <button key={'dialog-' + key} onClick={info.close ?? true ? () => close(info.callback?.()) : info.callback ?? (() => {})}>{info.text}</button>)}</div>
		</div>
	</div>, container);
});
export const createAlert = (content: string) => createDialog(content, [{ text: t('ok') }]);
export const createConfirm = (content: string) => createDialog(content, [{ text: t('cancel'), callback: () => false }, { text: t('ok'), callback: () => true }]);