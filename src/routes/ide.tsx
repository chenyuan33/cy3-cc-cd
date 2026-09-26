import { Hono } from "hono";
import { type AppEnv } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../components/card";
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from "../components/codemirror";
import { memoryLimitDefault, memoryLimitMax, timeLimitDefault, timeLimitMax } from "../settings";

const app = new Hono<AppEnv>();
app.get('/', c => {
	if (!c.get('currentUser')) {
		return loginRequired(c);
	}
	const translations = c.get('translations');
	return c.render(<Card>
		<CodeMirrorInit />
		<CodeMirrorLangInit lang='clike' />
		<CodeMirrorLangInit lang='python' />
		<CodeMirrorLangInit lang='javascript' />
		<script src='/ide.js' />
		<h1>{translations.ide}</h1>
		<div style={{ display: 'flex', gap: '20px' }}>
			<span><label for='lang'>{translations.onlineJudge.language}&nbsp;</label><select id='lang'></select></span>
			<span><label for='time'>{translations.onlineJudge.timeLimit}&nbsp;</label><input id='timeLimit' type='number' min='0' max={timeLimitMax} value={timeLimitDefault}></input></span>
			<span><label for='memory'>{translations.onlineJudge.memoryLimit}&nbsp;</label><input id='memoryLimit' type='number' min='0' max={memoryLimitMax} value={memoryLimitDefault}></input></span>
		</div>
		<CodeMirrorEditor id='code' height='400px' mode='text/plain' />
		<div style={{ display: 'flex' }}>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.stdin}</h2>
					<button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{translations.onlineJudge.run}</button>
					<CodeMirrorEditor id='stdin' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.expectedOutput}</h2>
					<CodeMirrorEditor id='expectedOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
				</div>
			</div>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.actualOutput}</h2>
					<span style={{ position: 'absolute', right: '10px', top: '20px' }} id='result'></span>
					<CodeMirrorEditor id='actualOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.stderr}</h2>
					<CodeMirrorEditor id='stderr' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly />
				</div>
			</div>
		</div>
	</Card>, { title: translations.ide });
});
export default app;