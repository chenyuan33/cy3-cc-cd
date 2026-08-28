import { Hono } from "hono";
import { type AppEnv } from "../types";
import { loginRequired } from "./errorPages";
import { Card } from "../components/card";
import { CodeMirrorEditor, CodeMirrorInit, CodeMirrorLangInit } from "../components/codemirror";
import { getText, translations } from "../translations";

const app = new Hono<AppEnv>();

app.get('/', c => {
    if (!c.get('currentUser')) {
        return loginRequired(c);
    }
    const locale = c.get('locale');
    const timeLimitMax = parseInt(getText(locale, 'timeLimitMax'));
    const memoryLimitMax = parseInt(getText(locale, 'memoryLimitMax'));

    // 构建 ideTranslations 对象（用于前端）
    const ideStatusKeys = Object.keys(translations[locale] || {})
        .filter(k => k.startsWith('ideStatus_'));
    const ideTranslationsObj: Record<string, string> = {};
    ideStatusKeys.forEach(k => {
        const status = k.replace('ideStatus_', '').replace(/_/g, ' ');
        ideTranslationsObj[status] = getText(locale, k);
    });
    // 额外添加 running 状态（非 API 状态）
    ideTranslationsObj['running'] = getText(locale, 'ideStatus_running');

    // 将对象转为安全的 JSON 字符串（用于嵌入）
    const ideTranslationsJson = JSON.stringify(ideTranslationsObj)
        .replace(/</g, '\\u003c') // 防止 XSS
        .replace(/>/g, '\\u003e');

    return c.render(<Card>
        <CodeMirrorInit />
        <CodeMirrorLangInit lang='clike' />
        <script src='/ide.js' />
        <script dangerouslySetInnerHTML={{
            __html: `window.ideTranslations = ${ideTranslationsJson};`
        }} />
        <h1>{getText(locale, 'ide')}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '10px', alignItems: 'center' }}>
            <div>
                <label style={{ marginRight: '5px' }}>{getText(locale, 'languageLabel')}</label>
                <select id="cxxVersion" style={{ padding: '4px 8px' }}>
                    <option value="">{getText(locale, 'loading')}</option>
                </select>
            </div>
            <div>
                <label style={{ marginRight: '5px' }}>{getText(locale, 'timeLimitLabel')}</label>
                <input type="number" id="timeLimit" value={getText(locale, 'timeLimitDefault')} style={{ width: '80px', padding: '4px' }}
                    onchange={`if (parseInt(this.value) > ${timeLimitMax}) this.value = ${timeLimitMax}; if (parseInt(this.value) < 1) this.value = 1;`}
                    oninput={`if (parseInt(this.value) > ${timeLimitMax}) this.value = ${timeLimitMax}; if (parseInt(this.value) < 1) this.value = 1;`}
                />
            </div>
            <div>
                <label style={{ marginRight: '5px' }}>{getText(locale, 'memoryLimitLabel')}</label>
                <input type="number" id="memoryLimit" value={getText(locale, 'memoryLimitDefault')} style={{ width: '80px', padding: '4px' }}
                    onchange={`if (parseInt(this.value) > ${memoryLimitMax}) this.value = ${memoryLimitMax}; if (parseInt(this.value) < 1) this.value = 1;`}
                    oninput={`if (parseInt(this.value) > ${memoryLimitMax}) this.value = ${memoryLimitMax}; if (parseInt(this.value) < 1) this.value = 1;`}
                />
            </div>
        </div>
        <CodeMirrorEditor id='code' height='400px' mode='text/x-c++src' />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <h2>{getText(locale, 'stdin')}</h2>
                <button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{getText(locale, 'run')}</button>
                <CodeMirrorEditor id='stdin' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <h2>{getText(locale, 'expectedOutput')}</h2>
                <CodeMirrorEditor id='expectedOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <h2>{getText(locale, 'actualOutput')}</h2>
                <CodeMirrorEditor id='actualOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly={true} />
            </div>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <h2>{getText(locale, 'stderr')}</h2>
                <CodeMirrorEditor id='stderr' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly={true} />
            </div>
        </div>
    </Card>, { title: getText(locale, 'ide') });
});

export default app;