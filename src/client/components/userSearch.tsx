import { useEffect, useRef, type CSSProperties, type FC } from "hono/jsx";
import { t, tString } from "../i18n";
import { render } from "hono/jsx/dom";
import type { userInfo } from "../../types";
import { User } from "./user";

export const UserSearch: FC<{
	id?: string | undefined,
	name?: string | undefined,
	onChange?: () => void,
	required?: boolean | undefined,
	style?: CSSProperties | string | undefined,
	value?: userInfo | undefined
}> = ({ id, name, onChange, required, style, value }) => {
	const hiddenInputRef = useRef<HTMLInputElement>(null);
	const selectorDivRef = useRef<HTMLDivElement>(null);
	const usernameOrUidInputRef = useRef<HTMLInputElement>(null);
	const currentChoiceRef = useRef<HTMLSpanElement>(null);
	let timeout = useRef<ReturnType<typeof setTimeout>>(null), requestId = 0;
	useEffect(() => () => clearTimeout(timeout.current ?? undefined), []);
	return <div style={style}>
		<input type='hidden' id={id} name={name} ref={hiddenInputRef} required={required} value={value?.id} />
		<input type='text' onInput={() => {
			if (!selectorDivRef.current) {
				return;
			}
			if (usernameOrUidInputRef.current && !usernameOrUidInputRef.current.value) {
				selectorDivRef.current.innerHTML = '';
				selectorDivRef.current.style.display = 'none';
				return;
			}
			selectorDivRef.current.innerHTML = tString('loading');
			selectorDivRef.current.style.display = 'block';
			clearTimeout(timeout.current ?? undefined);
			timeout.current = setTimeout(async () => {
				const currentRequestId = ++requestId;
				if (!usernameOrUidInputRef.current || !selectorDivRef.current) {
					return;
				}
				if (!usernameOrUidInputRef.current.value) {
					selectorDivRef.current.innerHTML = '';
					selectorDivRef.current.style.display = 'none';
					return;
				}
				const results = await (await fetch('/api/user/search?user=' + encodeURIComponent(usernameOrUidInputRef.current.value))).json() as userInfo[];
				if (requestId !== currentRequestId) {
					return;
				}
				selectorDivRef.current.innerHTML = '';
				selectorDivRef.current.style.display = 'block';
				render(results.length ? <>{results.map(user => <div style={{ cursor: 'pointer' }} onClick={() => {
					if (!hiddenInputRef.current || !currentChoiceRef.current || !selectorDivRef.current) {
						return;
					}
					selectorDivRef.current.innerHTML = '';
					selectorDivRef.current.style.display = 'none';
					hiddenInputRef.current.value = user.id.toString();
					currentChoiceRef.current.innerHTML = '';
					render(<User user={user} />, currentChoiceRef.current);
					onChange?.();
				}}><User user={user} linkable={false} /></div>)}</> : t('userNotExists'), selectorDivRef.current);
			}, 300);
		}} placeholder={tString('searchUsernameOrUid')} ref={usernameOrUidInputRef} />
		&nbsp;
		{t('currentChoice')}
		<span ref={currentChoiceRef}>{value ? <User user={value} /> : t('none')}</span>
		<div ref={selectorDivRef} style={{
			position: 'relative',
			zIndex: 6,
			padding: '10px',
			backgroundColor: 'gray',
			display: 'none'
		}}></div>
	</div>;
};