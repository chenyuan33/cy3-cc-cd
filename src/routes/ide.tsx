import { Hono } from "hono";
import { type AppEnv } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../components/card";
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from "../components/codemirror";
import { getText, translations } from "../translations";
import { memoryLimitDefault, memoryLimitMax, timeLimitDefault, timeLimitMax } from "../settings";

const app = new Hono<AppEnv>();
app.get('/', c => {
	if (!c.get('currentUser')) {
		return loginRequired(c);
	}
	const locale = c.get('locale');
	return c.render(<Card>
		<CodeMirrorInit />
		<CodeMirrorLangInit lang='clike' />
		<CodeMirrorLangInit lang='python' />
		<CodeMirrorLangInit lang='javascript' />
		<script dangerouslySetInnerHTML={{ __html: Object.entries(translations[locale] || translations.en || {}).filter(([key]) => key.startsWith('judgeResult_')).map(([key, value]) => `var ${key} = '${value}';`).join('') }} />
		<script src='/ide.js' />
		<h1>{getText(locale, 'ide')}</h1>
		<div style={{ display: 'flex', gap: '20px' }}>
			<span><label for='lang'>{getText(locale, 'language')}&nbsp;</label><select id='lang'></select></span>
			<span><label for='time'>{getText(locale, 'timeLimit')}&nbsp;</label><input id='timeLimit' type='number' min='0' max={timeLimitMax} value={timeLimitDefault}></input></span>
			<span><label for='memory'>{getText(locale, 'memoryLimit')}&nbsp;</label><input id='memoryLimit' type='number' min='0' max={memoryLimitMax} value={memoryLimitDefault}></input></span>
		</div>
		<CodeMirrorEditor id='code' height='400px' mode='text/plain' />
		<div style={{ display: 'flex' }}>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{getText(locale, 'stdin')}</h2>
					<button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{getText(locale, 'run')}</button>
					<CodeMirrorEditor id='stdin' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{getText(locale, 'expectedOutput')}</h2>
					<CodeMirrorEditor id='expectedOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
				</div>
			</div>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{getText(locale, 'actualOutput')}</h2>
					<span style={{ position: 'absolute', right: '10px', top: '20px' }} id='result'></span>
					<CodeMirrorEditor id='actualOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{getText(locale, 'stderr')}</h2>
					<CodeMirrorEditor id='stderr' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly />
				</div>
			</div>
		</div>
	</Card>, { title: getText(locale, 'ide') });
});
export default app;