import { type CSSProperties, type FC } from 'hono/jsx';
import './editor.css';
import { Editor, selectionWrapper, setValue } from '../editor/editor';
import { MdRender } from './renderer';
import { render } from 'hono/jsx/dom';
import { tString } from '../../i18n';

let mdeditorid = 0;
export const setValueMdEditor = (id: string, value: string) => setValue('mdeditor-input-' + id, value);
export const MdEditor: FC<{
    initialCode?: string,
    id?: string | undefined,
    name?: string | undefined,
    required?: boolean | undefined,
    height?: string,
    style?: CSSProperties
}> = ({ initialCode = '', id, name = '', required = false, height = '300px', style = {} }) => {
	id = id || 'mdeditor-' + ++mdeditorid;
    return <>
        <div class='mdeditor-div' style={{ height: height, ...style }}>
            <div class='mdeditor-input-cell'>
				<Editor
					id={'mdeditor-input-' + id}
					className='mdeditor-input'
					name={name}
					required={required}
					initialCode={initialCode}
					height={height}
					lang='md'
					onChange={(evt, content) => {
						const refresher = () => {
							render(<MdRender markdown={
								evt === undefined ? (document.getElementById('mdeditor-input-' + id)! as HTMLInputElement).value : content
							} />, document.getElementById('mdeditor-output-' + id)!);
						}
						if (document.readyState === 'loading') {
							document.addEventListener('DOMContentLoaded', refresher);
						} else {
							refresher();
						}
					}}
					extraKeys={[
						{ id: `${id}-strong`, label: tString('md.strong'), keybindings: ['Ctrl-b'], contextMenuGroupId: '4_markdown_operations', contextMenuOrder: 1, run: selectionWrapper('**', '**') },
						{ id: `${id}-italic`, label: tString('md.italic'), keybindings: ['Ctrl-i'], contextMenuGroupId: '4_markdown_operations', contextMenuOrder: 3, run: selectionWrapper('*', '*') },
						{ id: `${id}-delete`, label: tString('md.delete'), keybindings: ['Ctrl-Alt-x'], contextMenuGroupId: '4_markdown_operations', contextMenuOrder: 4, run: selectionWrapper('~~', '~~') }
					]}
				/>
            </div>
            <div class='mdeditor-output' id={'mdeditor-output-' + id} data-markdown=''><MdRender markdown={initialCode} /></div>
        </div>
    </>;
};