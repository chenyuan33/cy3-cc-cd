import { raw } from "hono/html";
import type { CSSProperties, FC } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";

export const Select: FC<{
	id: string | undefined,
	name: string | undefined,
	style: CSSProperties | string | undefined,
	onchange: string | undefined,
	options: { value: string, label: string | JSX.Element, selected?: boolean, disabled?: boolean }[]
}> = ({ id, name, style, onchange, options }) => {
	if (!options.length) {
		return <></>;
	}
	const defaultSelected = (options.filter(({ selected }) => selected)[0] || options[0])!;
	return <>
		<input type='hidden' id={id} name={name} onchange={onchange} value={defaultSelected.value} />
		<span
			style={style}
			id={'selector-main-' + id}
			class='selector-main'
			onclick={`document.getElementById('${'selector-options-div-' + id}').style.display=(document.getElementById('${'selector-options-div-' + id}').style.display=='block'?'none':'block')`}
		>
			<span id={'selector-maincontent-' + id}>{defaultSelected.label}</span>
			<i class='fa-solid fa-chevron-down'></i>
			<div id={'selector-options-div-' + id} class='selector-options-div'>
				{ options.map(({ value, label, disabled }) => <div>
					<div
						id={'selector-option-' + value + '-of-' + id}
						class={`selector-option ${value === defaultSelected.value ? 'selector-selected' : ''} ${disabled ? 'selector-disabled' : ''}`}
						onclick={disabled ? '' : `document.getElementById('${id}').value='${value}';document.getElementById('${'selector-maincontent-' + id}').innerHTML='${label.toString()}'`}
					>{label}</div>
				</div>) }
			</div>
		</span>
		{raw(`<script>
			document.addEventListener('click', function(event) {
				if (!document.getElementById('${'selector-main-' + id}').contains(event.target)) {
					document.getElementById('${'selector-options-div-' + id}').style.display = 'none';
				}
			});
		</script>`)}
	</>
};