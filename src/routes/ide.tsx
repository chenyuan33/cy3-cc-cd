import { Hono } from "hono";
import { type AppEnv } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../client/components/card";
import { memoryLimitDefault, memoryLimitMax, timeLimitDefault, timeLimitMax } from "../settings";
import { Editor } from "../client/components/editor/editor";

const app = new Hono<AppEnv>();
app.get('/', c => {
	if (!c.get('currentUser')) {
		return loginRequired(c);
	}
	const translations = c.get('translations');
	return c.render(<Card>
		<EditorInit c={c} />
		<EditorLangInit c={c} lang='clike' />
		<EditorLangInit c={c} lang='python' />
		<EditorLangInit c={c} lang='javascript' />
		<script src='/public/ide.js' />
		<h1>{translations.ide}</h1>
		<div style={{ display: 'flex', gap: '20px' }}>
			<span><label for='lang'>{translations.onlineJudge.language}&nbsp;</label><select id='lang'></select></span>
			<span><label for='time'>{translations.onlineJudge.timeLimit}&nbsp;</label><input id='timeLimit' type='number' min='0' max={timeLimitMax} value={timeLimitDefault}></input></span>
			<span><label for='memory'>{translations.onlineJudge.memoryLimit}&nbsp;</label><input id='memoryLimit' type='number' min='0' max={memoryLimitMax} value={memoryLimitDefault}></input></span>
		</div>
		<Editor c={c} id='code' height='400px' />
		<div style={{ display: 'flex' }}>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.stdin}</h2>
					<button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{translations.onlineJudge.run}</button>
					<Editor c={c} id='stdin' height='100px' style={{ overflow: 'auto' }} />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.expectedOutput}</h2>
					<Editor c={c} id='expectedOutput' height='100px' style={{ overflow: 'auto' }} />
				</div>
			</div>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.actualOutput}</h2>
					<span style={{ position: 'absolute', right: '10px', top: '20px' }} id='result'></span>
					<Editor c={c} id='actualOutput' height='100px' style={{ overflow: 'auto' }} readOnly />
				</div>
				<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
					<h2>{translations.onlineJudge.stderr}</h2>
					<Editor c={c} id='stderr' height='100px' style={{ overflow: 'auto' }} readOnly />
				</div>
			</div>
		</div>
	</Card>, { title: translations.ide });
});
export default app;