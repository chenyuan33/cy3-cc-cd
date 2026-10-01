import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, missingParams } from "../errorPages";
import validator from "validator";

const app = new Hono<AppEnv>();
app.on('post', ['/create', '/save/:id{\\d+}'], async c => {
	const env = c.env as any, currentUser = c.get('currentUser'), {
		name, useFrostedGlass,
		useBgImage, bgImageRepeatX, bgImageRepeatY,
		bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
		bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
		light_fgcolor, light_bgcolor, light_bgimage,
		dark_fgcolor, dark_bgcolor, dark_bgimage
	} = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	const id = c.req.param('id') ? (await env.db.prepare('SELECT id FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first())?.id ?? 0 : 0;
	if (currentUser.id !== 1 && currentUser.id !== id) {
		return accessDenied(c);
	}
	const bgImageSizeValidValues = ['auto', 'cover', 'contain', 'custom'];
	const bgImageSizeCustomValidUnits = Object.keys(c.get('translations').theme.lengthUnits);
	if (!name || !light_fgcolor || !dark_fgcolor || (useBgImage ? (false
		|| !light_bgimage || !validator.isURL(light_bgimage, { require_protocol: true })
		|| !dark_bgimage || !validator.isURL(dark_bgimage, { require_protocol: true })
		|| !bgImageSizeX || !bgImageSizeValidValues.includes(bgImageSizeX)
		|| bgImageSizeX === 'custom' && (false
			|| !bgImageSizeXCustom || !(parseInt(bgImageSizeXCustom) >= 0)
			|| !bgImageSizeXCustomUnit || !bgImageSizeCustomValidUnits.includes(bgImageSizeXCustomUnit)
		)
		|| !bgImageSizeY || !bgImageSizeValidValues.includes(bgImageSizeY)
		|| bgImageSizeY === 'custom' && (false
			|| !bgImageSizeYCustom || !(parseInt(bgImageSizeYCustom) >= 0)
			|| !bgImageSizeYCustomUnit || !bgImageSizeCustomValidUnits.includes(bgImageSizeYCustomUnit)
		)
	) : (!light_bgcolor || !dark_bgcolor))) {
		return missingParams(c);
	}
	if (id) {
		await env.db.prepare(`
			UPDATE theme
			SET
				updated_at = CURRENT_TIMESTAMP, name = ?, useFrostedGlass = ?,
				usebgimage = ?, bgImageRepeatX = ?, bgImageRepeatY = ?,
				bgImageSizeX = ?, bgImageSizeXCustom = ?, bgImageSizeXCustomUnit = ?,
				bgImageSizeY = ?, bgImageSizeYCustom = ?, bgImageSizeYCustomUnit = ?,
				light_fgcolor = ?, light_bgcolor = ?, light_bgimage = ?,
				dark_fgcolor = ?, dark_bgcolor = ?, dark_bgimage = ?
			WHERE id = ?
		`).bind(
			name, useFrostedGlass ? 1 : 0,
			useBgImage ? 1 : 0, bgImageRepeatX ? 1 : 0, bgImageRepeatY ? 1 : 0,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage,
			id
		).run();
		return c.redirect('/theme/' + id);
	} else {
		return c.redirect('/theme/' + (await env.db.prepare(`INSERT INTO theme (
			uid, name, useFrostedGlass,
			usebgimage, bgImageRepeatX, bgImageRepeatY,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(
			currentUser.id, name, useFrostedGlass ? 1 : 0,
			useBgImage ? 1 : 0, bgImageRepeatX ? 1 : 0, bgImageRepeatY ? 1 : 0,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		).first()).id);
	}
});
app.post('/apply/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	await env.db.prepare('UPDATE users SET using_theme = ? WHERE id = ?').bind((await env.db.prepare('SELECT id FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first())?.id || null, currentUser.id).run();
	return c.body(null, 204);
});
app.post('/delete/:id{\\d+}', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	const id = (await env.db.prepare('SELECT id FROM theme WHERE id = ?').bind(parseInt(c.req.param('id'))).first())?.id;
	if (currentUser.id !== 1 && currentUser.id !== id) {
		return accessDenied(c);
	}
	await env.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
	return c.redirect('/theme');
});
export default app;