import type { CSSProperties, FC } from "hono/jsx";

export const MonacoInit: FC<{}> = () => <>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
	<script dangerouslySetInnerHTML={{ __html: `
		window.MonacoEnvironment = {
			getWorkerUrl: function(workerId, label) {
				return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
					'self.MonacoEnvironment = { baseUrl: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/" };' +
					'importScripts("https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/base/worker/workerMain.js");'
				);
			}
		};
	` }} />
</>;

export const MonacoEditor: FC<{
	id: string,
	height?: string,
	language?: string,
	style?: CSSProperties,
	readOnly?: boolean
}> = ({ id, height = '400px', language = 'plaintext', style, readOnly = false }) => {
	const editorId = `monaco-${id}`;
	return <div id={editorId} style={{ height, width: '100%', overflow: 'hidden', border: '1px solid light-dark(#ccc, #444)', borderRadius: '4px', ...style }}></div>;
};

export const MonacoLangMap: Record<string, string> = {
	'python': 'python',
	'python3': 'python',
	'js': 'javascript',
	'javascript': 'javascript',
	'cpp14': 'cpp',
	'cpp17': 'cpp',
	'cpp20': 'cpp',
	'cpp23': 'cpp',
	'cpp14-o2': 'cpp',
	'cpp17-o2': 'cpp',
	'cpp20-o2': 'cpp',
	'cpp23-o2': 'cpp',
	'c': 'c',
	'cpp': 'cpp',
	'c++': 'cpp'
};
