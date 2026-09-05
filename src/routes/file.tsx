import { Hono } from "hono";
import { DOMParser, Node } from '@xmldom/xmldom'; (globalThis as any).DOMParser = DOMParser; (globalThis as any).Node = Node;
import { GetObjectCommand, paginateListObjectsV2, S3Client, type ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { type AppEnv } from "../types";
import { Form } from "../components/form";
import { Card } from "../components/card";
import { accessDenied, notFound } from "./errorPages";
import { getText } from "../translations";
import { User } from "../components/user";
import type { JSX } from "hono/jsx/jsx-runtime";
import { renderTemplate } from "../components/renderTemplate";

const app = new Hono<AppEnv>();
app.get('/:path{.*}', async c => {
	const currentUser = c.get('currentUser'), path = decodeURIComponent(c.req.param('path')), locale = c.get('locale'), env = c.env as any, currentPage = parseInt(c.get('reqBody').page || '1') || 1;
	if (!currentUser || currentUser.id !== 1 && !path.startsWith('/user/' + currentUser.id)) {
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
		try {
			const response = await client.send(new GetObjectCommand({
				Bucket: env.B2_BUCKET_NAME,
				Key: path,
			}));
			return new Response(response.Body as ReadableStream, {
				headers: {
					'Content-Type': response.ContentType || 'application/octet-stream',
					'Content-Length': response.ContentLength?.toString() || '',
				},
			});
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
			pathLinks.push(<a href={currentDir}>{currentDir.match(/^\/file\/user\/\d+\/$/) ? await renderTemplate(getText(locale, 'userSpace'), {__USER__: <User c={c} user={parseInt(currentDir.slice(11, -1))} linkable={false} />}) : dir}</a>);
		}
	}
	return c.render(<Card>
		<h1>{getText(locale, 'fileUpload')}</h1>
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
		]} submit={{ content: getText(locale, 'upload') }} style={{ display: 'flex', gap: '5px' }} />
		<br />
		<label for='goToFolder'>{getText(locale, 'fileGoToFolder')}</label>
		&nbsp;
		<input id='goToFolder' type='text' />
		&nbsp;
		<button onclick={'location.href = document.getElementById("goToFolder").value + "/"'}>{getText(locale, 'go')}</button>
		{(currentPageContent.CommonPrefixes || []).length || (currentPageContent.Contents || []).length ? <table>
			<thead><tr>
				<th>{getText(locale, 'fileName')}</th>
				<th>{getText(locale, 'fileSize')}</th>
				<th>{getText(locale, 'fileOperations')}</th>
			</tr></thead>
			<tbody>
				{(currentPageContent.CommonPrefixes || []).map(({ Prefix }) => Prefix ? <tr>
					<td colspan={3}><a href={'/file/' + Prefix}>{Prefix.substring(path.length)}</a></td>
				</tr> : <></>)}
				{(currentPageContent.Contents || []).map(({ Key, Size }) => Key ? <tr>
					<td><a href={'/file/' + Key}>{Key.substring(path.length)}</a></td>
					<td>{Size}</td>
					<td><a class='dangerousLink' href='javascript:void(0)' onclick={`confirm('${getText(locale, 'deleteConfirm')}') ? (location.href = '/api/file/delete/${Key}') : undefined`}>{getText(locale, 'delete')}</a></td>
				</tr> : <></>)}
			</tbody>
		</table> : <p>{getText(locale, 'fileFolderEmpty')}</p>}
	</Card>, { title: 'upload file' });
});
export default app;