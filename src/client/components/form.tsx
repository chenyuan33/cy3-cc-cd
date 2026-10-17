import { forwardRef, useImperativeHandle, useRef, type FC, type PropsWithChildren, type RefObject } from "hono/jsx";
import { MdEditor } from "./md/editor";
import type { JSX } from "hono/jsx/jsx-runtime";
import { Select } from "./select";
import { tString } from "../i18n";
import { toast } from "./toast";
import { navigate } from "@w3cj/ruta";

export const Form: FC<PropsWithChildren<{
	[x: string]: any,
	onSubmit?: (evt: Event, formData: FormData) => boolean | void | Promise<boolean | void>,
	onSuccess?: (data: any, formData: FormData) => void,
	onError?: (error: unknown, formData: FormData) => void,
	alignInput?: string,
	ref?: RefObject<HTMLFormElement> | ((x: HTMLFormElement | null) => void)
}>> = ({ children, onSubmit, onSuccess, onError, alignInput, ref, ...props }) => {
	return <form ref={ref} style={{ '--align-input': alignInput ?? '200px' }} {...props} onSubmit={async evt => {
		evt.preventDefault();
		const form = evt.currentTarget as HTMLFormElement;
		const button = form.querySelector('[type="submit"]') as HTMLButtonElement;
		if (!button || button.dataset.submitted === 'true') {
			return;
		}
		button.dataset.submitted = 'true';
		button.disabled = true;
		const formData = new FormData(form);
		try {
			if (onSubmit && false === await onSubmit(evt, formData)) {
				button.disabled = false;
				button.dataset.submitted = 'false';
				return;
			}
			button.disabled = false;
			button.dataset.submitted = 'false';
			if (!form.method || form.method === 'get') {
				const url = new URL(form.action, location.href);
				url.search = '';
				formData.forEach((value, key) => {
					if (typeof value === 'string') {
						url.searchParams.append(key, value);
					}
				});
				navigate(url.toString());
				onSuccess?.(undefined, formData);
			} else {
				const fetchResult = await fetch(form.action, { method: form.method, body: formData });
				if (!fetchResult.ok) {
					throw new Error((await fetchResult.json()).message || tString('error.somethingWentWrong'));
				}
				onSuccess?.(await fetchResult.json(), formData);
			}
		} catch (_error) {
			button.disabled = false;
			button.dataset.submitted = 'false';
			toast(_error instanceof Error ? _error.message : _error as string, 'error');
			onError?.(_error, formData);
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
}> = ({ id, class: className, name, label, required, type, placeholder, autocomplete, onInput = () => {}, value, min, max, minlength, maxlength, pattern }) => <div style={{ height: '50px' }} class={className}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<input id={id} type={type} name={name} onInput={onInput} required={required} style={label ? { position: 'absolute', left: 'var(--align-input)' } : {}} autocomplete={autocomplete || 'off'} value={value} placeholder={placeholder} min={min} max={max} minlength={minlength} maxlength={maxlength} pattern={pattern} />
</div>;
export const FormCheckbox: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	checked?: boolean,
	onchange?: string
}> = ({ id, class: className, name, label, required, checked, onchange }) => <div class={className}>
	<input id={id} type='checkbox' name={name} required={required} autocomplete='off' checked={checked} onchange={onchange} />
	{label && <label for={id}><strong>{label}</strong></label>}
</div>;
export const FormMdEditor: FC<{
	id?: string,
	name?: string,
	label?: string | JSX.Element,
	required?: boolean,
	height?: string,
	initialCode?: string
}> = ({ id, name, label, required, height = '300px', initialCode = '' }) => <div style={{ height: `calc(${height} + 10px)` }}>
	{label && <label for={'mdeditor-input-' + id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<MdEditor id={id} name={name} required={required} style={{ position: 'relative', left: label ? 'var(--align-input)' : 0, width: label ? 'calc(100% - 200px)' : '100%' }} height={height} initialCode={initialCode} />
</div>;
export const FormSelect: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string | JSX.Element,
	options: { value: string, label: string | JSX.Element, selected?: boolean, disabled?: boolean }[],
	onChange?: () => void
}> = ({ id, class: className, name, label, options, onChange = () => {} }) => <div class={className} style={{ height: '50px' }}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<Select id={id} name={name} style={{ position: 'absolute', left: 'var(--align-input)' }} onChange={onChange} options={options} />
</div>;