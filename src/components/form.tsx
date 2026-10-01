import type { FC, PropsWithChildren } from "hono/jsx";
import { MdEditor } from "./mdeditor";
import type { JSX } from "hono/jsx/jsx-runtime";
import { Select } from "./select";

export const Form: FC<PropsWithChildren<{ [x: string]: any }>> = ({ children, ...props }) => <form {...props} onsubmit={`var _form = this; var _button = _form.querySelector('[type="submit"]'); if (_button && _button.dataset.submitting === 'true') return false; if (_button) { _button.dataset.submitting = 'true'; _button.disabled = true; } var _result = true; try { _result = (function(){ ${props.onsubmit || ''} })(); } catch (_error) { if (_button) { _button.dataset.submitting = 'false'; _button.disabled = false; } throw _error; } if (_result === false && _button) { _button.dataset.submitting = 'false'; _button.disabled = false; } return _result;`}>{children}</form>;
export const FormInput: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string,
	required?: boolean,
	type: 'button' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'tel' | 'text' | 'time' | 'url' | 'week',
	placeholder?: string,
	autocomplete?: AutoFill,
	oninput?: string,
	value?: string,
	min?: number,
	max?: number,
	minlength?: number,
	maxlength?: number,
	pattern?: string
}> = ({ id, class: className, name, label, required, type, placeholder, autocomplete, oninput, value, min, max, minlength, maxlength, pattern }) => <div style={{ height: '50px' }} class={className}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<input id={id} type={type} name={name} oninput={oninput} required={required} style={label ? { position: 'absolute', left: '200px' } : {}} autocomplete={autocomplete || 'off'} value={value} placeholder={placeholder} min={min} max={max} minlength={minlength} maxlength={maxlength} pattern={pattern} />
</div>;
export const FormCheckbox: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string,
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
	label?: string,
	required?: boolean,
	height?: string,
	locale: string,
	initialCode?: string
}> = ({ id, name, label, required, height = '300px', locale, initialCode = '' }) => <div style={{ height: `calc(${height} + 10px)` }}>
	{label && <label for={'mdeditor-input-' + id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<MdEditor id={id} name={name} required={required} style={{ position: 'relative', left: label ? '200px' : 0, width: label ? 'calc(100% - 100px)' : '100%' }} height={height} locale={locale} initialCode={initialCode} />
</div>;
export const FormSelect: FC<{
	id?: string,
	class?: string,
	name?: string,
	label?: string,
	options: { value: string, label: string | JSX.Element, selected?: boolean, disabled?: boolean }[],
	onchange?: string
}> = ({ id, class: className, name, label, options, onchange = '' }) => <div class={className} style={{ height: '50px' }}>
	{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
	<Select id={id} name={name} style={{ position: 'absolute', left: '200px' }} onchange={onchange} options={options} />
</div>;