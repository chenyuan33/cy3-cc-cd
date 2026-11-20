import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, missingParams } from "../errorPages";
import validator from "validator";
import en_us from "../../i18n/en_us";
import { userInfoDatas } from "./user";

const app = new Hono<AppEnv>();
const isHexColor = (color: string | undefined) => color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
const isPositiveInteger = (numStr: string) => /^\d+$/.test(numStr);
const isValidSafeUrl = (url: string | undefined) => url && validator.isURL(url, { require_protocol: true, protocols: ['http', 'https'] }) && !/[()"'\s]/.test(url);
app.get('/list', async c => {
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	const perPage = Math.min(20, Math.max(parseInt(c.get('reqBody').perPage || '20') || 20, 20));
	return c.json({
		results: (await c.env.db.prepare(`
			SELECT
				t.id, t.name, t.created_at, t.updated_at,
				json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
				(SELECT COUNT(*) FROM users uu WHERE uu.using_theme = t.id) AS number_of_users,
				t.usebgimage, t.useFrostedGlass, t.editor,
				t.bgImageRepeatX, t.bgImageRepeatY,
				t.bgImageSizeX, t.bgImageSizeXCustom, t.bgImageSizeXCustomUnit,
				t.bgImageSizeY, t.bgImageSizeYCustom, t.bgImageSizeYCustomUnit,
				t.light_fgcolor, t.light_bgcolor, t.light_bgimage,
				t.dark_fgcolor, t.dark_bgcolor, t.dark_bgimage
			FROM theme t
			JOIN users u ON t.uid = u.id
			LIMIT ?
			OFFSET ?
		`).bind(perPage, (page - 1) * perPage).all()).results.map(({ user, ...theme }) => ({ user: JSON.parse(user as string), ...theme })),
		total: await c.env.db.prepare('SELECT COUNT(*) as total FROM theme').first<{ total: number }>()
	});
});
app.get('/detail/:id{\\d+}', async c => {
	const id = parseInt(c.req.param('id'));
	return c.json({ info: await c.env.db.prepare(`
		SELECT
			uid, name, useFrostedGlass, editor,
			usebgimage, bgImageRepeatX, bgImageRepeatY,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		FROM theme
		WHERE id = ?
	`).bind(id).first() });
});
app.on('post', ['/create', '/save/:id{\\d+}'], async c => {
	const currentUser = c.get('currentUser'), {
		name, useFrostedGlass, editor,
		useBgImage, bgImageRepeatX, bgImageRepeatY,
		bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
		bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
		light_fgcolor, light_bgcolor, light_bgimage,
		dark_fgcolor, dark_bgcolor, dark_bgimage
	} = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	const { id, uid } = c.req.param('id') ? await c.env.db.prepare('SELECT id, uid FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first<{ id: number, uid: number }>() ?? { id: null, uid: null } : { id: null, uid: null };
	if (id && currentUser.id !== 1 && currentUser.id !== uid) {
		return accessDenied(c);
	}
	const bgImageSizeValidValues = ['auto', 'cover', 'contain', 'custom'];
	const bgImageSizeCustomValidUnits = Object.keys(en_us.theme.lengthUnits);
	if (
		!name || 
		!editor || !['CodeMirror', 'MonacoEditor'].includes(editor) || 
		!isHexColor(light_fgcolor) || !isHexColor(dark_fgcolor) || 
		(useBgImage ? (
			!isValidSafeUrl(light_bgimage) || !isValidSafeUrl(dark_bgimage) ||
			!bgImageSizeX || !bgImageSizeValidValues.includes(bgImageSizeX) ||
			(bgImageSizeX === 'custom' && (
				!bgImageSizeXCustom || !isPositiveInteger(bgImageSizeXCustom) ||
				!bgImageSizeXCustomUnit || !bgImageSizeCustomValidUnits.includes(bgImageSizeXCustomUnit)
			)) ||
			!bgImageSizeY || !bgImageSizeValidValues.includes(bgImageSizeY) ||
			(bgImageSizeY === 'custom' && (
				!bgImageSizeYCustom || !isPositiveInteger(bgImageSizeYCustom) ||
				!bgImageSizeYCustomUnit || !bgImageSizeCustomValidUnits.includes(bgImageSizeYCustomUnit)
			))
		) : !isHexColor(light_bgcolor) || !isHexColor(dark_bgcolor))
	) {
		return missingParams(c);
	}
	if (id) {
		await c.env.db.prepare(`
			UPDATE theme
			SET
				updated_at = CURRENT_TIMESTAMP, name = ?, useFrostedGlass = ?, editor = ?,
				usebgimage = ?, bgImageRepeatX = ?, bgImageRepeatY = ?,
				bgImageSizeX = ?, bgImageSizeXCustom = ?, bgImageSizeXCustomUnit = ?,
				bgImageSizeY = ?, bgImageSizeYCustom = ?, bgImageSizeYCustomUnit = ?,
				light_fgcolor = ?, light_bgcolor = ?, light_bgimage = ?,
				dark_fgcolor = ?, dark_bgcolor = ?, dark_bgimage = ?
			WHERE id = ?
		`).bind(
			name, useFrostedGlass ? 1 : 0, editor,
			useBgImage ? 1 : 0, bgImageRepeatX ? 1 : 0, bgImageRepeatY ? 1 : 0,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage,
			id
		).run();
		return c.json({ success: true });
	} else {
		return c.json({ success: true, id: (await c.env.db.prepare(`INSERT INTO theme (
			uid, name, useFrostedGlass, editor,
			usebgimage, bgImageRepeatX, bgImageRepeatY,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(
			currentUser.id, name, useFrostedGlass ? 1 : 0, editor,
			useBgImage ? 1 : 0, bgImageRepeatX ? 1 : 0, bgImageRepeatY ? 1 : 0,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		).first<{ id: number }>())?.id });
	}
});
app.post('/apply/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const id = (await c.env.db.prepare('SELECT id FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first())?.id || null;
	await c.env.db.prepare('UPDATE users SET using_theme = ? WHERE id = ?').bind(id, currentUser.id).run();
	return c.json({ success: true });
});
app.delete('/delete/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	const id = (await c.env.db.prepare('SELECT id FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first())?.id;
	if (currentUser.id !== 1 && currentUser.id !== id) {
		return accessDenied(c);
	}
	await c.env.db.prepare('DELETE FROM theme WHERE id = ?').bind(id).run();
	return c.json({ success: true });
});
export default app;