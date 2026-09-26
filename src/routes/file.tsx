import { Hono } from "hono";
import { DOMParser, Node } from '@xmldom/xmldom'; (globalThis as any).DOMParser = DOMParser; (globalThis as any).Node = Node;
import { GetObjectCommand, paginateListObjectsV2, S3Client, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { type AppEnv } from "../types";
import { Form } from "../components/form";
import { Card } from "../components/card";
import { accessDenied, notFound } from "./errorPages";
import { User } from "../components/user";
import type { JSX } from "hono/jsx/jsx-runtime";
import { renderTemplate } from "../components/renderTemplate";
import { DeleteLink } from "../components/button";
import { permissionFile } from "../settings";

const app = new Hono<AppEnv>();
app.use('/*', async (c, next) => {
	if (!c.get('currentUser') || !(c.get('currentUser')!.permission & permissionFile)) {
		return accessDenied(c);
	}
	await next();
});
app.get('/:path{.*}', async c => {
	const currentUser = c.get('currentUser'), path = decodeURIComponent(c.req.param('path')), translations = c.get('translations'), env = c.env as any, currentPage = parseInt(c.get('reqBody').page || '1') || 1;
	if (!currentUser || currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) && path.endsWith('/')) {
		return accessDenied(c);
	}
	const client = new S3Client({
		region: env.B2_REGION,
		endpoint: env.B2_ENDPOINT,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		},
		forcePathStyle: true,
	});
	if (path && !path.endsWith('/')) {
		c.header('Cache-Control', 'public, max-age=3600, must-revalidate');
		try {
			const response = await client.send(new GetObjectCommand({
				Bucket: env.B2_BUCKET_NAME,
				Key: path,
			}));
			c.header('Content-Length', response.ContentLength?.toString() || '');
			if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'video/mp4', 'audio/mpeg'].includes(response.ContentType || '')) {
				c.header('Content-Type', response.ContentType);
			} else {
				c.header('Content-Type', 'application/octet-stream');
			}
			return c.body(response.Body as ReadableStream);
		} catch {
			return notFound(c);
		}
	}
	const paginator = paginateListObjectsV2({ client }, { Bucket: env.B2_BUCKET_NAME, Prefix: path, Delimiter: '/' });
	let currentPageCount = 0, currentPageContent: ListObjectsV2CommandOutput | undefined;
	for await (const page of paginator) {
		if (++currentPageCount === currentPage) {
			currentPageContent = page;
		}
	}
	if (currentPageContent === undefined) {
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
		<Form action='/api/file/upload' method='post' enctype='multipart/form-data' inputs={[
			{ id: 'file', name: 'file', required: true, main: { type: 'input', inputType: 'file' } },
			{ name: 'path', main: { type: 'input', inputType: 'hidden', value: path } }
		]} submit={{ content: translations.upload }} style={{ display: 'flex', gap: '5px' }} />
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
				<th style={{ whiteSpace: 'nowrap' }}>{translations.file.operations}</th>
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