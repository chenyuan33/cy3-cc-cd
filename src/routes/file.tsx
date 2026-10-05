import { Hono } from "hono";
import { DOMParser } from '@xmldom/xmldom';
import { AwsClient } from "aws4fetch";
import { type AppEnv } from "../types";
import { Form, FormInput } from "../client/components/form";
import { Card } from "../client/components/card";
import { accessDenied, loginRequired, notFound } from "./errorPages";
import type { JSX } from "hono/jsx/jsx-runtime";
import { renderTemplate } from "../components/renderTemplate";
import { DeleteLink } from "../client/components/button";
import { permissionFile } from "../settings";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!(currentUser.permission & permissionFile)) {
		return accessDenied(c);
	}
	await next();
});
app.get('/:path{.*}', async c => {
	const currentUser = c.get('currentUser')!, path = decodeURIComponent(c.req.param('path')), translations = c.get('translations'), env = c.env as any, currentPage = parseInt(c.get('reqBody').page || '1') || 1;
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) && path.endsWith('/')) {
		return accessDenied(c);
	}
	const aws = new AwsClient({
		accessKeyId: env.B2_APPLICATION_KEY_ID,
		secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: env.B2_REGION
	});
	if (path && !path.endsWith('/')) {
		c.header('Cache-Control', 'public, max-age=3600, must-revalidate');
		try {
			const response = await aws.fetch(new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/${path}`).toString());
			c.header('Content-Length', response.headers.get('Content-Length')?.toString() || '');
			if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'video/mp4', 'audio/mpeg'].includes(response.ContentType || '')) {
				c.header('Content-Type', response.headers.get('Content-Type') ?? undefined);
			} else {
				c.header('Content-Type', 'application/octet-stream');
			}
			return c.body(response.body as ReadableStream);
		} catch {
			return notFound(c);
		}
	}
	let currentPageCount = 0;
	let currentPageContent: any = null;
	let continuationToken: string | null | undefined;
	while (currentPageCount < currentPage) {
		const listUrl = new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/`);
		listUrl.searchParams.set('list-type', '2');
		listUrl.searchParams.set('prefix', path);
		listUrl.searchParams.set('delimiter', '/');
		if (continuationToken) {
			listUrl.searchParams.set('continuation-token', continuationToken);
		}
		const res = await aws.fetch(listUrl.toString());
		if (!res.ok) {
			throw new Error(`S3 List failed: ${res.status}`);
		}
		const xmlText = await res.text();
		const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
		const isTruncated = doc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true';
		continuationToken = doc.getElementsByTagName('NextContinuationToken')[0]?.textContent;
		if (++currentPageCount === currentPage) {
			currentPageContent = {
				CommonPrefixes: Array.from(doc.getElementsByTagName('CommonPrefixes')).map(el => ({
					Prefix: el.getElementsByTagName('Prefix')[0]?.textContent,
				})),
				Contents: Array.from(doc.getElementsByTagName('Contents')).map(el => ({
					Key: el.getElementsByTagName('Key')[0]?.textContent,
					Size: parseInt(el.getElementsByTagName('Size')[0]?.textContent || '0', 10),
				})),
			};
			break;
		}
		if (!isTruncated) break;
	}
	if (currentPageContent === undefined || currentPageContent === null) {
		return notFound(c);
	}
	let currentDir = '/file/';
	const pathLinks = [];
	for (const dir of path.replace(/\/+$/, '').split('/')) {
		currentDir += dir + '/';
		if (currentDir !== '/file/user/') {
			pathLinks.push(<a href={currentDir}>{currentDir.match(/^\/file\/user\/\d+\/$/) ? await renderTemplate(translations.userSpace, {__USER__: <User c={c} user={parseInt(currentDir.slice(11, -1))} linkable={false} />}) : dir}</a>);
		}
	}
	return c.render(<Card>
		<h1>{translations.file.name}</h1>
		{pathLinks.reduce((arr, cur) => {
			if (Array.isArray(arr)) {
				arr.push(<i class='fa-solid fa-angle-right'></i>);
				arr.push(cur);
				return arr;
			}
			return [cur];
		}, [] as JSX.Element[])}
		<Form action='/api/file/upload' method='post' enctype='multipart/form-data' style={{ display: 'flex', gap: '5px' }}>
			<FormInput id='file' name='file' required type='file' />
			<input name='path' type='hidden' value={path} />
			<input type='submit' value={translations.upload} />
		</Form>
		<br />
		<label for='goToFolder'>{translations.file.goToFolder}</label>
		&nbsp;
		<input id='goToFolder' type='text' />
		&nbsp;
		<button onclick={'location.href = document.getElementById("goToFolder").value + "/"'}>{translations.go}</button>
		{(currentPageContent.CommonPrefixes || []).length || (currentPageContent.Contents || []).length ? <table style={{ width: '100%' }}>
			<thead><tr>
				<th style={{ textAlign: 'left', width: '100%' }}>{translations.file.name}</th>
				<th style={{ whiteSpace: 'nowrap' }}>{translations.file.size}</th>
				<th style={{ whiteSpace: 'nowrap' }}>{translations.operations}</th>
			</tr></thead>
			<tbody>
				{(currentPageContent.CommonPrefixes || []).map(({ Prefix }) => Prefix ? <tr>
					<td colspan={3}><a href={'/file/' + Prefix}>{Prefix.substring(path.length)}</a></td>
				</tr> : <></>)}
				{(currentPageContent.Contents || []).map(({ Key, Size }) => Key ? <tr>
					<td><a href={'/file/' + Key}>{Key.substring(path.length)}</a></td>
					<td>{Size}</td>
					<td><DeleteLink c={c} href={'/api/file/delete/' + Key} arg={{}} redirect='' /></td>
				</tr> : <></>)}
			</tbody>
		</table> : <p>{translations.file.folderEmpty}</p>}
	</Card>, { title: translations.file.name });
});
export default app;