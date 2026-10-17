import { useEffect, useRef, useState } from "hono/jsx";
import { memoryLimitDefault, memoryLimitMax, timeLimitDefault, timeLimitMax } from "../../settings";
import { Card } from "../components/card";
import { Editor, getValue, setLang, setValue, type supportedLanguages } from "../components/editor/editor";
import { Select } from "../components/select";
import { t, tString } from "../i18n";
import { setTitle } from "../utils/setTitle";
import { render } from "hono/jsx/dom";

export const IDE = () => {
	const [langs, setLangs] = useState<{ value: string, label: string }[] | null>(null);
	const [running, setRunning] = useState(false);
	useEffect(() => {
		(async () => setLangs((await (await fetch('/api/support-langs')).json()).languages))();
	}, []);
	const langSelectorRef = useRef<HTMLInputElement>(null);
	const timeLimitRef = useRef<HTMLInputElement>(null);
	const memoryLimitRef = useRef<HTMLInputElement>(null);
	const resultRef = useRef<HTMLSpanElement>(null);
	const loadLang = () => {
		if (langSelectorRef.current) {
			setLang('code', langSelectorRef.current.value as supportedLanguages);
		}
	};
	useEffect(loadLang, [langs]);
	if (!langs) {
		setTitle(tString('loading') + ' - ' + tString('ide.name'));
		return <Card>
			<h1>{t('ide.name')}</h1>
			<p>{t('loading')}</p>
		</Card>;
	}
	if (!langs.length) {
		setTitle(tString('error.somethingWentWrong') + ' - ' + tString('ide.name'));
		return <Card>
			<h1>{t('error.somethingWentWrong')} - {t('ide.name')}</h1>
			<p>{t('ide.noLanguageSupported')}</p>
		</Card>;
	}
	setTitle(tString('ide.name'));
	return <Card>
		<h1>{t('ide.name')}</h1>
		<div style={{ display: 'flex', gap: '20px' }}>
			<span><label for='lang'>{t('onlineJudge.language')}&nbsp;</label><Select id='lang' ref={langSelectorRef} options={langs} onChange={loadLang}></Select></span>
			<span><label for='time'>{t('onlineJudge.timeLimit')}&nbsp;</label><input id='timeLimit' ref={timeLimitRef} type='number' min='0' max={timeLimitMax} value={timeLimitDefault}></input></span>
			<span><label for='memory'>{t('onlineJudge.memoryLimit')}&nbsp;</label><input id='memoryLimit' ref={memoryLimitRef} type='number' min='0' max={memoryLimitMax} value={memoryLimitDefault}></input></span>
		</div>
		<Editor id='code' height='calc(100vh - 425px)' />
		<div style={{ display: 'flex' }}>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{t('onlineJudge.stdin')}</h2>
				<Editor id='stdin' height='100px' style={{ overflow: 'auto' }} />
			</div>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{t('onlineJudge.expectedOutput')}</h2>
				<button style={{ position: 'absolute', right: '10px', top: '20px' }} disabled={running} onClick={() => {
					const url = new URL('/ws/ide-judge', location.href);
					url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
					const judger = new WebSocket(url.toString());
					judger.addEventListener('open', () => {
						if (!langSelectorRef.current || !timeLimitRef.current || !memoryLimitRef.current || !resultRef.current) {
							return;
						}
						judger.send(JSON.stringify({
							lang: langSelectorRef.current.value,
							timeLimit: timeLimitRef.current.value,
							memoryLimit: memoryLimitRef.current.value,
							code: getValue('code') ?? '',
							stdin: getValue('stdin') ?? '',
							expectedOutput: getValue('expectedOutput') ?? ''
						}));
						resultRef.current.innerHTML = '';
						render(t('onlineJudge.judgeResult.Judging'), resultRef.current);
						setRunning(true);
					});
					judger.addEventListener('message', ({ data: dataString }) => {
						if (!resultRef.current) {
							return;
						}
						const data = JSON.parse(dataString);
						resultRef.current.innerHTML = '';
						render(<span>
							{t(`onlineJudge.judgeResult.${data.status.replaceAll(' ', '_')}` as any) ?? data.status}
							{data.time_ms ? <><br />{data.time_ms}ms</> : null}
						</span>, resultRef.current);
						setValue('actualOutput', data.stdout ?? '');
						setValue('stderr', data.stderr ?? '');
						setRunning(false);
					});
				}}>{t('onlineJudge.run')}</button>
				<Editor id='expectedOutput' height='100px' style={{ overflow: 'auto' }} />
			</div>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{t('onlineJudge.actualOutput')}</h2>
				<span style={{ position: 'absolute', right: '10px', top: '20px' }} ref={resultRef}></span>
				<Editor id='actualOutput' height='100px' style={{ overflow: 'auto' }} readOnly />
			</div>
			<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
				<h2>{t('onlineJudge.stderr')}</h2>
				<Editor id='stderr' height='100px' style={{ overflow: 'auto' }} readOnly />
			</div>
		</div>
	</Card>;
};