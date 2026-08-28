import { Hono } from "hono";
import { type AppEnv } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../components/card";
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from "../components/codemirror";
import { getText } from "../translations";

const app = new Hono<AppEnv>();
app.get('/', c => {
	if (!c.get('currentUser')) {
		return loginRequired(c);
	}
	const locale = c.get('locale');
	return c.render(<Card>
		<CodeMirrorInit />
		<CodeMirrorLangInit lang='clike' />
		<script src='/ide.js' />
		<h1>{getText(locale, 'ide')}</h1>
		<CodeMirrorEditor id='code' height='400px' mode='text/x-c++src' />
		<div style={{ display: 'flex' }}>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{getText(locale, 'stdin')}</h2>
				<button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{getText(locale, 'run')}</button>
				<CodeMirrorEditor id='stdin' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
			</div>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{getText(locale, 'stdout')}</h2>
				<span style={{ position: 'absolute', right: '10px', top: '20px' }} id='result'></span>
				<CodeMirrorEditor id='stdout' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
			</div>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{getText(locale, 'stderr')}</h2>
				<CodeMirrorEditor id='stderr' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
			</div>
		</div>
	</Card>, { title: getText(locale, 'ide') });
});
export default app;