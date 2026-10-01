import { Hono } from "hono";
import type { AppEnv } from "../types";
import { Card } from "../components/card";
import { Pages } from "../components/pages";
import { DeleteButton, DeleteLink, FetchButton, FetchLink } from "../components/button";
import { User } from "../components/user";
import { Time } from "../components/time";
import { Form, FormCheckbox, FormInput, FormSelect } from "../components/form";
import { loginRequired, notFound } from "./errorPages";
import { defaultTheme } from "../settings";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	const translations = c.get('translations'), env = c.env as any, currentUser = c.get('currentUser');
	const perPage = 20;
	const currentPage = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
	const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM theme').first();
	const totalPage = Math.ceil(total / perPage);
	const { results } = await env.db.prepare('SELECT id, uid, name, created_at, updated_at, light_bgcolor, dark_bgcolor, light_bgimage, dark_bgimage FROM theme LIMIT ? OFFSET ?').bind(perPage, (currentPage - 1) * perPage).all();
	return c.render(<Card>
		<h1>{translations.theme.list}</h1>
		<button><a href='/theme/create'>{translations.theme.create}</a></button>
		<FetchButton c={c} href='/api/theme/apply/0' redirect='' text={translations.theme.reset} />
		{results.length ? <table>
			<thead>
				<tr>
					<th>{translations.theme.themeColor}</th>
					<th>{translations.theme.themeName}</th>
					<th>{translations.creator}</th>
					<th>{translations.createdAt}</th>
					<th>{translations.updatedAt}</th>
					<th>{translations.theme.numberOfUsers}</th>
					{currentUser ? <th>{translations.operations}</th> : null}
				</tr>
			</thead>
			<tbody>
				{results.map(async ({ id, uid, name, created_at, updated_at, light_bgcolor, dark_bgcolor, light_bgimage, dark_bgimage }: { id: number, uid: number, name: string, created_at: string, updated_at: string, light_bgcolor: string, dark_bgcolor: string, light_bgimage: string, dark_bgimage: string }) => (
					<tr key={id}>
						<td><div style={{ backgroundColor: `light-dark(${light_bgcolor}, ${dark_bgcolor})`, backgroundImage: `light-dark(url(${light_bgimage}), url(${dark_bgimage}))` }}></div></td>
						<td>{name}</td>
						<td><User c={c} user={uid} /></td>
						<td><Time c={c} time={created_at}></Time></td>
						<td><Time c={c} time={updated_at}></Time></td>
						<td>{(await env.db.prepare('SELECT COUNT(*) as total FROM users WHERE using_theme = ?').bind(id).first()).total}</td>
						{currentUser ? <td>
							<FetchLink c={c} href={`/api/theme/apply/${id}`} redirect='' text={translations.apply} />
							&nbsp;
							<a href={`/theme/${id}`}>{translations.edit}</a>
							{currentUser.id === 1 || currentUser.id === uid ? <>&nbsp;<DeleteLink c={c} href={`/api/theme/delete/${id}`} redirect='' /></> : null}
						</td> : null}
					</tr>
				))}
			</tbody>
		</table> : <p>{translations.nothing}</p>}
		<Pages c={c} currentPage={currentPage} totalPage={totalPage} />
	</Card>, { title: translations.theme.list });
});
app.on('get', ['/create', '/:id{\\d+}'], async c => {
	const translations = c.get('translations'), currentUser = c.get('currentUser'), id = c.req.param('id'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	const theme = id ? await env.db.prepare(`
		SELECT
			uid, name, useFrostedGlass,
			usebgimage, bgImageRepeatX, bgImageRepeatY,
			bgImageSizeX, bgImageSizeXCustom, bgImageSizeXCustomUnit,
			bgImageSizeY, bgImageSizeYCustom, bgImageSizeYCustomUnit,
			light_fgcolor, light_bgcolor, light_bgimage,
			dark_fgcolor, dark_bgcolor, dark_bgimage
		FROM theme
		WHERE id = ?
	`).bind(id).first() : { uid: currentUser.id, name: '', ...defaultTheme };
	if (id && !theme) {
		return notFound(c);
	}
	return c.render(<Card>
		<link rel='stylesheet' type='text/css' href='/theme/create.css' />
		<script src='/theme/create.js'></script>
		<h1>{id ? translations.theme.edit + ' - ' + theme.name : translations.theme.create}</h1>
		<FetchButton c={c} href={`/api/theme/apply/${id}`} redirect='' text={translations.apply} />
		<Form action='/api/theme/create' method='post' class='usebgcolor'>
			<FormInput id='name' name='name' label={translations.theme.themeName} required type='text' value={theme.name} />
			<FormCheckbox id='useBgImage' name='useBgImage' label={translations.theme.useBgImage} onchange='updateUseBgImage()' checked={!!theme.usebgimage} />
			<div class='onbgimage'>
				<FormCheckbox id='bgImageRepeatX' name='bgImageRepeatX' label={translations.theme.bgImageRepeat.x} checked={!!theme.bgImageRepeatX} />
				<FormCheckbox id='bgImageRepeatY' name='bgImageRepeatY' label={translations.theme.bgImageRepeat.y} checked={!!theme.bgImageRepeatY} />
				<FormSelect id='bgImageSizeX' name='bgImageSizeX' label={translations.theme.bgImageSize.x} options={[
					{ value: 'auto', label: translations.theme.bgImageSize.auto, selected: theme.bgImageSizeX === 'auto' },
					{ value: 'cover', label: translations.theme.bgImageSize.cover, selected: theme.bgImageSizeX === 'cover' },
					{ value: 'contain', label: translations.theme.bgImageSize.contain, selected: theme.bgImageSizeX === 'contain' },
					{ value: 'custom', label: translations.theme.bgImageSize.custom, selected: theme.bgImageSizeX === 'custom' }
				]} onchange='updateBgImageSizeX()' />
				<FormInput id='bgImageSizeXCustom' name='bgImageSizeXCustom' label={translations.theme.bgImageSizeCustom.x} class='onbgimagexcustom' type='number' min={0} value={theme.bgImageSizeXCustom || '0'} />
				<FormSelect id='bgImageSizeXCustomUnit' name='bgImageSizeXCustomUnit' class='onbgimagexcustom' options={Object.entries(translations.theme.lengthUnits).map(([value, label]) => ({ value, label: `${value} (${label})`, checked: theme.bgImageSizeXCustomUnit === value }))} />
				<FormSelect id='bgImageSizeY' name='bgImageSizeY' label={translations.theme.bgImageSize.y} options={[
					{ value: 'auto', label: translations.theme.bgImageSize.auto, selected: theme.bgImageSizeY === 'auto' },
					{ value: 'cover', label: translations.theme.bgImageSize.cover, selected: theme.bgImageSizeY === 'cover' },
					{ value: 'contain', label: translations.theme.bgImageSize.contain, selected: theme.bgImageSizeY === 'contain' },
					{ value: 'custom', label: translations.theme.bgImageSize.custom, selected: theme.bgImageSizeY === 'custom' }
				]} onchange='updateBgImageSizeY()' />
				<FormInput id='bgImageSizeYCustom' name='bgImageSizeYCustom' label={translations.theme.bgImageSizeCustom.y} class='onbgimageycustom' type='number' min={0} value={theme.bgImageSizeYCustom || '0'} />
				<FormSelect id='bgImageSizeYCustomUnit' name='bgImageSizeYCustomUnit' class='onbgimageycustom' options={Object.entries(translations.theme.lengthUnits).map(([value, label]) => ({ value, label: `${value} (${label})`, checked: theme.bgImageSizeYCustomUnit === value }))} />
			</div>
			<FormCheckbox id='useFrostedGlass' name='useFrostedGlass' label={translations.theme.useFrostedGlass} checked={!!theme.useFrostedGlass} />
			<h2>{translations.theme.lightTheme}</h2>
			<FormInput id='light_fgcolor' name='light_fgcolor' label={translations.theme.fgcolor} required type='color' value={theme.light_fgcolor || '#000000'} />
			<FormInput id='light_bgcolor' class='onbgcolor' name='light_bgcolor' label={translations.theme.bgcolor} required type='color' value={theme.light_bgcolor || '#ffffff'} />
			<FormInput id='light_bgimage' class='onbgimage' name='light_bgimage' label={translations.theme.bgimage} type='url' value={theme.light_bgimage || ''} />
			<h2>{translations.theme.darkTheme}</h2>
			<FormInput id='dark_fgcolor' name='dark_fgcolor' label={translations.theme.fgcolor} required type='color' value={theme.dark_fgcolor || '#ffffff'} />
			<FormInput id='dark_bgcolor' class='onbgcolor' name='dark_bgcolor' label={translations.theme.bgcolor} required type='color' value={theme.dark_bgcolor || '#000000'} />
			<FormInput id='dark_bgimage' class='onbgimage' name='dark_bgimage' label={translations.theme.bgimage} type='url' value={theme.dark_bgimage || ''} />
			<input type='submit' value={id ? translations.theme.saveAsNew : translations.theme.create} />
			{id && (theme.uid === currentUser.id || currentUser.id === 1) ? <>
				<input type='submit' value={translations.save} formAction={'/api/theme/save/' + id} />
				<DeleteButton c={c} href={'/api/theme/delete/' + id} redirect='' />
			</> : null}
		</Form>
	</Card>, { title: id ? translations.theme.edit + ' - ' + theme.name : translations.theme.create });
});
export default app;