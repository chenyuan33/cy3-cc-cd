import { type FC, type PropsWithChildren, type RefObject } from "hono/jsx";
import { MdEditor } from "./md/editor";
import type { JSX } from "hono/jsx/jsx-runtime";
import { Select } from "./select";
import { tString } from "../i18n";
import { toast } from "./toast";
import { navigate } from "@w3cj/ruta";
import { UserSearch } from "./userSearch";
import type { userInfo } from "../../types";

export const Form: FC<PropsWithChildren<{
	[x: string]: any,
	onSubmit?: (evt: Event, formData: FormData, submitter: HTMLElement | null) => boolean | void | Promise<boolean | void>,
	onSuccess?: (data: any, formData: FormData, submitter: HTMLElement | null) => void,
	onError?: (error: unknown, formData: FormData, submitter: HTMLElement | null) => void,
	alignInput?: string,
	ref?: RefObject<HTMLFormElement> | ((x: HTMLFormElement | null) => void)
}>> = ({ children, onSubmit, onSuccess, onError, alignInput, ref, ...props }) => {
	return <form ref={ref} style={{ '--align-input': alignInput ?? '200px' }} {...props} onSubmit={async evt => {
		evt.preventDefault();
		const form = evt.currentTarget as HTMLFormElement;
		const button = (evt as SubmitEvent).submitter as HTMLButtonElement;
		if (!button || button.dataset.submitted === 'true') {
			return;
		}
		const action = button.formAction || form.action;
		const method = button.formMethod || form.method;
		button.dataset.submitted = 'true';
		button.disabled = true;
		const formData = new FormData(form);
		try {
			if (onSubmit && false === await onSubmit(evt, formData, button)) {
				button.disabled = false;
				button.dataset.submitted = 'false';
				return;
			}
			if (!method || method === 'get') {
				button.disabled = false;
				button.dataset.submitted = 'false';
				const url = new URL(action, location.href);
				url.search = '';
				formData.forEach((value, key) => {
					if (typeof value === 'string') {
						url.searchParams.append(key, value);
					}
				});
				onSuccess?.(undefined, formData, button);
				navigate(url.toString());
			} else {
				const fetchResult = await fetch(action, { method, body: formData });
				button.disabled = false;
				button.dataset.submitted = 'false';
				if (!fetchResult.ok) {
					throw new Error((await fetchResult.json()).message || tString('error.somethingWentWrong'));
				}
				onSuccess?.(await fetchResult.json(), formData, button);
			}
		} catch (_error) {
			button.disabled = false;
			button.dataset.submitted = 'false';
			toast(_error instanceof Error ? _error.message : _error as string, 'error');
			onError?.(_error, formData, button);
		}
	}}>{children}</form>;
};
export const FormInput: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	type: 'button' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'tel' | 'text' | 'time' | 'url' | 'week',
	placeholder?: string,
	autocomplete?: AutoFill,
	onInput?: (event: InputEvent) => void,
	value?: string,
	min?: number,
	max?: number,
	minlength?: number,
	maxlength?: number,
	pattern?: string
}> = ({ id, class: className, name, label, required, type, placeholder, autocomplete, onInput = () => {}, value, min, max, minlength, maxlength, pattern }) => <div style={{ height: '50px', position: 'relative' }} class={className}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<input id={id} type={type} name={name} onInput={onInput} required={required} style={label ? { position: 'absolute', left: 'var(--align-input)' } : {}} autocomplete={autocomplete || 'off'} value={value} placeholder={placeholder} min={min} max={max} minlength={minlength} maxlength={maxlength} pattern={pattern} />
</div>;
export const FormUserSearch: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	onChange?: () => void,
	value?: userInfo,
}> = ({ id, class: className, name, label, required, onChange = () => {}, value }) => <div style={{ height: '50px', position: 'relative' }} class={className}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<UserSearch id={id} name={name} onChange={onChange} required={required} style={label ? { position: 'absolute', left: 'var(--align-input)' } : {}} value={value} />
</div>;
export const FormCheckbox: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	checked?: boolean,
	onChange?: () => void
}> = ({ id, class: className, name, label, required, checked, onChange = () => {} }) => <div class={className}>
	<input id={id} type='checkbox' name={name} required={required} autocomplete='off' checked={checked} onChange={onChange} />
	{label && <label for={id}><strong>{label}</strong></label>}
</div>;
export const FormMdEditor: FC<{
	id?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	height?: string,
	initialCode?: string
}> = ({ id, name, label, required, height = '300px', initialCode = '' }) => <div style={{ height: `calc(${height} + 10px)`, position: 'relative' }}>
	{label && <label for={'mdeditor-input-' + id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<MdEditor id={id} name={name} required={required} style={{ position: 'relative', left: label ? 'var(--align-input)' : 0, width: label ? 'calc(100% - var(--align-input))' : '100%' }} height={height} initialCode={initialCode} />
</div>;
export const FormSelect: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	options: { value: string, label: string | JSX.Element, selected?: boolean, disabled?: boolean }[],
	onChange?: () => void
}> = ({ id, class: className, name, label, options, onChange = () => {} }) => <div class={className} style={{ height: '50px', position: 'relative' }}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<Select id={id} name={name} style={{ position: 'absolute', left: 'var(--align-input)' }} onChange={onChange} options={options} />
</div>;