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
    const versionList = getText(locale, 'cxxVersionList').split(',');
    const versionOptions = versionList.map(v => ({
        value: v,
        label: getText(locale, 'cxxVersion_' + v)
    }));
    const timeLimitMax = parseInt(getText(locale, 'timeLimitMax'));
    const memoryLimitMax = parseInt(getText(locale, 'memoryLimitMax'));
    return c.render(<Card>
        <CodeMirrorInit />
        <CodeMirrorLangInit lang='clike' />
        <script src='/ide.js' />
        <h1>{getText(locale, 'ide')}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '10px', alignItems: 'center' }}>
            <div>
                <label style={{ marginRight: '5px' }}>{getText(locale, 'cxxVersionLabel')}</label>
                <select id="cxxVersion" style={{ padding: '4px 8px' }}>
                    {versionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="cxxO2" /> {getText(locale, 'cxxO2Label')}
                </label>
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
        <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <h2>{getText(locale, 'stdin')}</h2>
                <button style={{ position: 'absolute', right: '10px', top: '20px' }} onclick='run()'>{getText(locale, 'run')}</button>
                <CodeMirrorEditor id='stdin' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <h2>{getText(locale, 'expectedOutput')}</h2>
                <CodeMirrorEditor id='expectedOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} />
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <h2>{getText(locale, 'actualOutput')}</h2>
                <CodeMirrorEditor id='actualOutput' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly={true} />
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <h2>{getText(locale, 'stderr')}</h2>
                <CodeMirrorEditor id='stderr' height='100px' mode='text/plain' style={{ overflow: 'auto' }} readOnly={true} />
            </div>
        </div>
    </Card>, { title: getText(locale, 'ide') });
});
export default app;