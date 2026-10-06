import { useEffect, useRef, type CSSProperties, type FC } from "hono/jsx";
import type { editor } from "monaco-editor";
import { isLightMode } from "../../utils/isLightMode";

export const MonacoEditors: editor.IStandaloneCodeEditor[] = [];
const MonacoEditorMap = new Map<string, editor.IStandaloneCodeEditor>();
export const wrapSelectionMonacoEditor = async (editor: editor.IStandaloneCodeEditor, prefix: string, suffix: string) => {
	const selection = editor.getSelection(), { Selection } = await import('monaco-editor');
	const model = editor.getModel();
	if (!selection || !model) return;
	const selectedText = model.getValueInRange(selection);
	editor.executeEdits('wrap', [{
		range: selection,
		text: `${prefix}${selectedText}${suffix}`,
		forceMoveMarkers: true,
	}]);
	const newSelection = new Selection(
		selection.startLineNumber,
		selection.startColumn + prefix.length,
		selection.endLineNumber,
		selection.endColumn + prefix.length,
	);
	editor.setSelection(newSelection);
}
export const setValueMonacoEditor = (id: string, value: string) => {
	const editor = MonacoEditorMap.get(id);
	if (!editor) {
		return;
	}
	editor.setValue(value);
};
export const MonacoEditor: FC<{
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	lang: string,
	onChange?: (event: editor.IModelContentChangedEvent, content: string) => void,
	extraKeys?: {
		id: string,
		label: string,
		keybindings: string[],
		contextMenuGroupId: string,
		contextMenuOrder: number,
		run: (ed: editor.IStandaloneCodeEditor) => void | Promise<void>
	}[],
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ id, className, name, required, initialCode, height, lang, onChange, extraKeys, style, readOnly }) => {
	const containerRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null), editorRef = useRef<editor.IStandaloneCodeEditor>(null);
	let cancelled = false;
	useEffect(() => {
		const timeout = setTimeout(async () => {
			const { KeyMod, KeyCode } = await import('monaco-editor');
			const monacoKeyMap = {
				Ctrl: KeyMod.CtrlCmd,
				Shift: KeyMod.Shift,
				Alt: KeyMod.Alt,
				Win: KeyMod.WinCtrl,
				Backspace: KeyCode.Backspace,
				Tab: KeyCode.Tab,
				Enter: KeyCode.Enter,
				PauseBreak: KeyCode.PauseBreak,
				CapsLock: KeyCode.CapsLock,
				Escape: KeyCode.Escape,
				Space: KeyCode.Space,
				PageUp: KeyCode.PageUp,
				PageDown: KeyCode.PageDown,
				End: KeyCode.End,
				Home: KeyCode.Home,
				LeftArrow: KeyCode.LeftArrow,
				UpArrow: KeyCode.UpArrow,
				RightArrow: KeyCode.RightArrow,
				DownArrow: KeyCode.DownArrow,
				Insert: KeyCode.Insert,
				Delete: KeyCode.Delete,
				0: KeyCode.Digit0,
				1: KeyCode.Digit1,
				2: KeyCode.Digit2,
				3: KeyCode.Digit3,
				4: KeyCode.Digit4,
				5: KeyCode.Digit5,
				6: KeyCode.Digit6,
				7: KeyCode.Digit7,
				8: KeyCode.Digit8,
				9: KeyCode.Digit9,
				a: KeyCode.KeyA,
				b: KeyCode.KeyB,
				c: KeyCode.KeyC,
				d: KeyCode.KeyD,
				e: KeyCode.KeyE,
				f: KeyCode.KeyF,
				g: KeyCode.KeyG,
				h: KeyCode.KeyH,
				i: KeyCode.KeyI,
				j: KeyCode.KeyJ,
				k: KeyCode.KeyK,
				l: KeyCode.KeyL,
				m: KeyCode.KeyM,
				n: KeyCode.KeyN,
				o: KeyCode.KeyO,
				p: KeyCode.KeyP,
				q: KeyCode.KeyQ,
				r: KeyCode.KeyR,
				s: KeyCode.KeyS,
				t: KeyCode.KeyT,
				u: KeyCode.KeyU,
				v: KeyCode.KeyV,
				w: KeyCode.KeyW,
				x: KeyCode.KeyX,
				y: KeyCode.KeyY,
				z: KeyCode.KeyZ,
				Meta: KeyCode.Meta,
				ContextMenu: KeyCode.ContextMenu,
				F1: KeyCode.F1,
				F2: KeyCode.F2,
				F3: KeyCode.F3,
				F4: KeyCode.F4,
				F5: KeyCode.F5,
				F6: KeyCode.F6,
				F7: KeyCode.F7,
				F8: KeyCode.F8,
				F9: KeyCode.F9,
				F10: KeyCode.F10,
				F11: KeyCode.F11,
				F12: KeyCode.F12,
				F13: KeyCode.F13,
				F14: KeyCode.F14,
				F15: KeyCode.F15,
				F16: KeyCode.F16,
				F17: KeyCode.F17,
				F18: KeyCode.F18,
				F19: KeyCode.F19,
				F20: KeyCode.F20,
				F21: KeyCode.F21,
				F22: KeyCode.F22,
				F23: KeyCode.F23,
				F24: KeyCode.F24,
				NumLock: KeyCode.NumLock,
				ScrollLock: KeyCode.ScrollLock,
				';': KeyCode.Semicolon,
				'=': KeyCode.Equal,
				',': KeyCode.Comma,
				'-': KeyCode.Minus,
				'.': KeyCode.Period,
				'/': KeyCode.Slash,
				'`': KeyCode.Backquote,
				'[': KeyCode.BracketLeft,
				'\\': KeyCode.Backslash,
				']': KeyCode.BracketRight,
				'\'': KeyCode.Quote,
				OEM_8: KeyCode.OEM_8,
				IntlBackslash: KeyCode.IntlBackslash,
				Numpad0: KeyCode.Numpad0,
				Numpad1: KeyCode.Numpad1,
				Numpad2: KeyCode.Numpad2,
				Numpad3: KeyCode.Numpad3,
				Numpad4: KeyCode.Numpad4,
				Numpad5: KeyCode.Numpad5,
				Numpad6: KeyCode.Numpad6,
				Numpad7: KeyCode.Numpad7,
				Numpad8: KeyCode.Numpad8,
				Numpad9: KeyCode.Numpad9,
				NumpadMultiply: KeyCode.NumpadMultiply,
				NumpadAdd: KeyCode.NumpadAdd,
				NUMPAD_SEPARATOR: KeyCode.NUMPAD_SEPARATOR,
				NumpadSubtract: KeyCode.NumpadSubtract,
				NumpadDecimal: KeyCode.NumpadDecimal,
				NumpadDivide: KeyCode.NumpadDivide
			} as Record<string, number>;
			const { default: EditorWorker } = await import('monaco-editor/editor/editor.worker?worker');
			const { default: TsWorker } = await import('monaco-editor/language/typescript/ts.worker?worker');
			self.MonacoEnvironment = {
				getWorker(_, label) {
					if (label === 'ts') {
						return new TsWorker();
					}
					return new EditorWorker();
				}
			};
			const monaco = await import('monaco-editor');
			if (cancelled || !containerRef.current) {
				return;
			}
			const lightMode = isLightMode();
			const currentEditor = monaco.editor.create(containerRef.current, {
				value: initialCode || '',
				language: lang,
				automaticLayout: true,
				readOnly: !!readOnly,
				theme: lightMode ? 'vs-light' : 'vs-dark'
			});
			editorRef.current = currentEditor;
			MonacoEditors.push(currentEditor);
			MonacoEditorMap.set(id, currentEditor);
			currentEditor.onDidChangeModelContent(evt => {
				if (!inputRef.current) {
					return;
				}
				inputRef.current.value = currentEditor.getValue();
				if (onChange) {
					onChange(evt, currentEditor.getValue());
				}
			});
			extraKeys?.forEach(({ id, label, keybindings, contextMenuGroupId, contextMenuOrder, run }) => {
				currentEditor.addAction({
					id, label, contextMenuGroupId, contextMenuOrder, run,
					keybindings: keybindings.map(keybinding => keybinding.split('-').map(key => monacoKeyMap[key] ?? 0).reduce((last, cur) => last | cur, 0))
				});
			});
		}, 100);
		return () => {
			cancelled = true;
			editorRef.current?.dispose();
			editorRef.current = null;
			clearTimeout(timeout);
		};
	}, [id, className, name, required, initialCode, height, lang, readOnly]);
	return <div style={style}>
		<div
			ref={containerRef}
			id={id}
			class={className}
			style={{ height, width: '100%' }}
		/>
		<input type="hidden" name={name} required={required} ref={inputRef} />
	</div>;
};