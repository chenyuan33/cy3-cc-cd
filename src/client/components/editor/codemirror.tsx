import { useEffect, useRef, type CSSProperties, type FC } from "hono/jsx";
import { isLightMode } from "../../isLightMode";
import type { LanguageSupport } from "@codemirror/language";
import type { EditorView, ViewUpdate } from "@codemirror/view";
import type { Compartment } from "@codemirror/state";

export const CodeMirrorEditors: { editor: EditorView, themeCompartment: Compartment }[] = [];
const CodeMirrorMap = new Map<string, EditorView>();
export const wrapSelectionCodeMirror = async (view: EditorView, prefix: string, suffix: string) => {
	const { state } = view, { EditorSelection } = await import('@codemirror/state');
	const changes = state.changeByRange((range) => {
		const selectedText = state.sliceDoc(range.from, range.to);
		return {
			changes: {
				from: range.from,
				to: range.to,
				insert: `${prefix}${selectedText}${suffix}`,
			},
			range: EditorSelection.range(
				range.from + prefix.length,
				range.to + prefix.length,
			),
		};
	});
	view.dispatch(
		state.update(changes, {
			scrollIntoView: true,
			userEvent: 'input.wrap',
		}),
	);
}
export const setValueCodeMirror = (id: string, value: string) => {
	const editor = CodeMirrorMap.get(id);
	if (!editor) {
		return;
	}
	editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
};
export const CodeMirrorEditor: FC<{
	id: string,
	className?: string,
	name?: string,
	required?: boolean,
	initialCode?: string,
	height: number | string,
	lang: LanguageSupport | undefined,
	onChange?: (update: ViewUpdate, content: string) => void,
	extraKeys?: {
		id: string,
		label: string,
		keybindings: string[],
		contextMenuGroupId: string,
		contextMenuOrder: number,
		run: (ed: EditorView) => void | boolean | Promise<void | boolean>
	}[],
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ id, className, name, required = false, initialCode = '', height, lang, onChange = () => { }, extraKeys = [], style, readOnly = false }) => {
	const inputRef = useRef<HTMLInputElement>(null), containerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let cancelled = false;
		let editor: EditorView | null = null;
		(async () => {
			if (!containerRef.current) {
				return;
			}
			const { EditorView } = await import('codemirror');
			const { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } = await import('@codemirror/language');
			const { Compartment, EditorState } = await import('@codemirror/state');
			const { crosshairCursor, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers, rectangularSelection } = await import('@codemirror/view');
			const { defaultKeymap, history, historyKeymap } = await import('@codemirror/commands');
			const { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } = await import('@codemirror/autocomplete');
			const { highlightSelectionMatches, searchKeymap } = await import('@codemirror/search');
			const { duotoneLight, duotoneDark } = await import('@uiw/codemirror-theme-duotone');
			if (cancelled || !containerRef.current) {
				return;
			}
			const themeCompartment = new Compartment();
			editor = new EditorView({
				doc: initialCode,
				extensions: [
					lineNumbers(),
					highlightActiveLineGutter(),
					highlightSpecialChars(),
					history(),
					foldGutter(),
					drawSelection(),
					dropCursor(),
					EditorState.allowMultipleSelections.of(true),
					indentOnInput(),
					syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
					bracketMatching(),
					closeBrackets(),
					autocompletion(),
					rectangularSelection(),
					crosshairCursor(),
					highlightActiveLine(),
					highlightSelectionMatches(),
					themeCompartment.of(isLightMode() ? duotoneLight : duotoneDark),
					keymap.of([
						...closeBracketsKeymap,
						...defaultKeymap,
						...searchKeymap,
						...historyKeymap,
						...foldKeymap,
						...completionKeymap,
						...extraKeys.flatMap(({ keybindings, run }) => keybindings.map(key => ({
							key, run: (ed: EditorView) => !(run(ed) === false)
						})))
					]),
					...(lang ? [lang] : []),
					EditorState.readOnly.of(readOnly),
					EditorView.updateListener.of(update => {
						if (!update.docChanged) {
							return;
						}
						if (inputRef.current) {
							inputRef.current.value = update.view.state.doc.toString();
						}
						onChange(update, update.state.doc.toString());
					}),
					EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } })
				],
				parent: containerRef.current
			});
			CodeMirrorEditors.push({ editor, themeCompartment });
			CodeMirrorMap.set(id, editor);
		})();
		return () => {
			cancelled = true;
			if (editor) {
				const entry = CodeMirrorEditors.find(({ editor: registeredEditor }) => registeredEditor === editor);
				const i = entry ? CodeMirrorEditors.indexOf(entry) : -1;
				if (i >= 0) {
					CodeMirrorEditors.splice(i, 1);
				}
				if (CodeMirrorMap.get(id) === editor) {
					CodeMirrorMap.delete(id);
				}
				editor.destroy();
				editor = null;
			}
		};
	}, [id, className, name, required, initialCode, height, lang, readOnly]);
	return <div style={{ overflow: 'hidden', ...style }} id={id} class={className}>
		<div ref={containerRef} style={{ height }}></div>
		<input type='hidden' name={name} required={required} ref={inputRef} />
	</div>;
}