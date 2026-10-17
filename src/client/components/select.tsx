import type { CSSProperties, FC, RefObject } from "hono/jsx";
import { render, useEffect, useRef, useState } from "hono/jsx/dom";
import type { JSX } from "hono/jsx/jsx-runtime";

export const Select: FC<{
	id?: string | undefined,
	name?: string | undefined,
	style?: CSSProperties | string | undefined,
	onChange?: () => void,
	options: { value: string, label: string | JSX.Element, selected?: boolean | undefined, disabled?: boolean | undefined }[],
	ref?: RefObject<HTMLInputElement>
}> = ({ id, name, style, onChange = () => {}, options, ref }) => {
	if (!options.length) {
		return <></>;
	}
	const [selected, setSelected_] = useState(options.filter(({ selected }) => selected)[0] || options[0]!);
	const _inputRef = useRef<HTMLInputElement>(null);
	const inputRef = ref || _inputRef;
	const setSelected = ({ value, label, selected, disabled }: {
		value: string;
		label: string | JSX.Element;
		selected?: boolean | undefined;
		disabled?: boolean | undefined;
	}) => {
		setSelected_({ value, label, selected, disabled });
		if (inputRef.current) {
			inputRef.current.value = value;
		}
	};
	const mainRef = useRef<HTMLSpanElement>(null);
	const [optionDivOpen, setOptionDivOpen] = useState(false);
	useEffect(() => {
		const handler = (event: PointerEvent) => {
			if (mainRef.current && event.target instanceof HTMLElement && !mainRef.current.contains(event.target)) {
				setOptionDivOpen(false);
			}
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}, [id, name]);
	return <>
		<input type='hidden' id={id} name={name} value={selected.value} ref={inputRef} />
		<span
			style={style}
			ref={mainRef}
			class='selector-main'
			onClick={() => setOptionDivOpen(cur => !cur)}
		>
			<span>{selected.label}</span>
			<i class='fa-solid fa-chevron-down'></i>
			<div class='selector-options-div' style={{ display: optionDivOpen ? 'block' : 'none' }}>
				{ options.map(({ value, label, disabled }) => <div
					class={`selector-option ${value === selected.value ? 'selector-selected' : ''} ${disabled ? 'selector-disabled' : ''}`}
					onClick={() => {
						if (disabled) {
							return;
						}
						setSelected({ value, label, disabled });
						onChange?.();
					}}
				>{label}</div>) }
			</div>
		</span>
	</>
};