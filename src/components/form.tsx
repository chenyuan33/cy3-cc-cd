import type { CSSProperties, FC } from "hono/jsx";
import { MdEditor } from "./mdeditor";
import type { JSX } from "hono/jsx/jsx-runtime";

export const createSubmitHandler = (onsubmit?: string) => `var _form = this; var _button = _form.querySelector('button[type="submit"]'); if (_button && _button.dataset.submitting === 'true') return false; if (_button) { _button.dataset.submitting = 'true'; _button.disabled = true; } var _result = true; try { _result = (function(){ ${onsubmit || ''} })(); } catch (_error) { if (_button) { _button.dataset.submitting = 'false'; _button.disabled = false; } throw _error; } if (_result === false && _button) { _button.dataset.submitting = 'false'; _button.disabled = false; } return _result;`;
export const Form: FC<{ action: string, method: 'get' | 'post', enctype?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain', onsubmit?: string, inputs: { id?: string, name?: string, label?: string, required?: boolean, main:
	{
		type: 'input',
		inputType: 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week',
		placeHolder?: string,
		autocomplete?: AutoFill,
		oninput?: string,
		value?: string,
		checked?: boolean
	}
	| { type: 'mdeditor', mdeditorHeight?: string }
	| {
		type: 'select',
		optionGroups?: { group: string, options: { value: string, label: string, selected?: boolean, disabled?: boolean }[] }[],
		options?: { value: string, label: string | JSX.Element, selected?: boolean, disabled?: boolean }[]
	}
}[], submit: { content: string, disabled?: boolean } | JSX.Element, locale?: string, style?: CSSProperties | string | undefined }> = ({ action, method, enctype, onsubmit, inputs, submit, locale, style }) => <form action={action} method={method} enctype={enctype} onsubmit={createSubmitHandler(onsubmit)} style={style}>
	{inputs.map(({ id, name, label, main, required = false }) => 
		main.type === 'input' ? main.inputType === 'checkbox' ? <div>
			<input id={id} type='checkbox' name={name} oninput={main.oninput} required={required} autocomplete={main.autocomplete || 'off'} value={main.value} checked={main.checked} />
			{label && <label for={id}><strong>{label}</strong></label>}
		</div>
		: <div style={{ height: main.inputType === 'hidden' ? '0px' : '50px' }}>
			{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
			<input id={id} type={main.inputType} name={name} oninput={main.oninput} required={required} style={label ? { position: 'absolute', right: '10px' } : {}} autocomplete={main.autocomplete || 'off'} value={main.value} placeholder={main.placeHolder} />
		</div>
		: main.type === 'mdeditor' ? <div style={{ height: `calc(${main.mdeditorHeight || '300px'} + 10px)` }}>
			{label && <label for={'mdeditor-input-' + id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
			<MdEditor id={id} name={name} required={required} style={{ position: 'relative', left: label ? '100px': 0, width: label ? 'calc(100% - 100px)' : '100%' }} height={main.mdeditorHeight || '300px'} locale={locale} />
		</div>
		: <div style={{ height: '50px' }}>
			{label && <label for={id} style={{ position: 'absolute', left: '10px' }}><strong>{label}</strong></label>}
			<select id={id} name={name} required={required} style={{ position: 'absolute', right: '10px' }}>
				{(main.options || []).map(({ value, label, selected, disabled }) => <option value={value} selected={selected && !disabled} disabled={disabled}>{label}</option>)}
				{(main.optionGroups || []).map(({ group, options }) => <optgroup label={group}>{options.map(({ value, label, selected, disabled }) => <option value={value} selected={selected && !disabled} disabled={disabled}>{label}</option>)}</optgroup>)}
			</select>
		</div>
	)}
	{'content' in submit ? <button type='submit' disabled={submit.disabled}>{submit.content}</button> : submit}
</form>;