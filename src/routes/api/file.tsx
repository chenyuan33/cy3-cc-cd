import { Hono } from "hono";
import { AwsClient } from "aws4fetch";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, notFound } from "../errorPages";
import { permissionFile } from "../../settings";
import { DOMParser } from '@xmldom/xmldom';

const validatePath = (path: string) => {
	if (path.includes('..')) {
		throw new Error('Invalid path');
	}
	return decodeURIComponent(path).split('/').map(encodeURIComponent).join('/');
};
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
app.get('/get/:path{.*}', async c => {
	const path = validatePath(c.req.param('path'));
	const aws = new AwsClient({
		accessKeyId: c.env.B2_APPLICATION_KEY_ID,
		secretAccessKey: c.env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: c.env.B2_REGION
	});
	c.header('Cache-Control', 'public, max-age=3600, must-revalidate');
	const response = await aws.fetch(new URL(`${c.env.B2_ENDPOINT}/${c.env.B2_BUCKET_NAME}/${path}`).toString());
	if (!response.ok) {
		return response;
	}
	c.header('Content-Length', response.headers.get('Content-Length')?.toString() || '');
	if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'video/mp4', 'audio/mpeg'].includes(response.headers.get('Content-Type') || '')) {
		c.header('Content-Type', response.headers.get('Content-Type') ?? undefined);
	} else {
		c.header('Content-Type', 'application/octet-stream');
	}
	return c.body(response.body as ReadableStream);
});
app.get('/list/:path{.*}', async c => {
	const currentUser = c.get('currentUser')!;
	const path = validatePath(c.req.param('path'));
	const currentPage = parseInt(c.get('reqBody').page || '1') || 1;
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) || !path.endsWith('/')) {
		return accessDenied(c);
	}
	const aws = new AwsClient({
		accessKeyId: c.env.B2_APPLICATION_KEY_ID,
		secretAccessKey: c.env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: c.env.B2_REGION
	});
	c.header('Cache-Control', 'public, max-age=3600, must-revalidate');
	let currentPageCount = 0;
	let continuationToken: string | null | undefined;
	while (currentPageCount < currentPage) {
		const listUrl = new URL(`${c.env.B2_ENDPOINT}/${c.env.B2_BUCKET_NAME}/`);
		listUrl.searchParams.set('list-type', '2');
		listUrl.searchParams.set('prefix', path);
		listUrl.searchParams.set('delimiter', '/');
		if (continuationToken) {
			listUrl.searchParams.set('continuation-token', continuationToken);
		}
		const res = await aws.fetch(listUrl.toString());
		if (!res.ok) {
			return res;
		}
		const xmlText = await res.text();
		const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
		const isTruncated = doc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true';
		continuationToken = doc.getElementsByTagName('NextContinuationToken')[0]?.textContent;
		if (++currentPageCount === currentPage) {
			return c.json({
				CommonPrefixes: Array.from(doc.getElementsByTagName('CommonPrefixes')).map(el => ({
					Prefix: el.getElementsByTagName('Prefix')[0]?.textContent,
				})),
				Contents: Array.from(doc.getElementsByTagName('Contents')).map(el => ({
					Key: el.getElementsByTagName('Key')[0]?.textContent,
					Size: parseInt(el.getElementsByTagName('Size')[0]?.textContent || '0', 10),
				})),
			});
		}
		if (!isTruncated) break;
	}
	return notFound(c);
});
app.post('/upload', async c => {
	const currentUser = c.get('currentUser')!;
	const body = await c.req.parseBody();
	const path = validatePath(body.path as string || '');
	const file = body.file as File;
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) && path.endsWith('/')) {
		return accessDenied(c);
	}
	const aws = new AwsClient({
		accessKeyId: c.env.B2_APPLICATION_KEY_ID,
		secretAccessKey: c.env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: c.env.B2_REGION
	});
	if (typeof path !== 'string') {
		return notFound(c);
	}
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id)) {
		return accessDenied(c);
	}
	if (!file) {
		return c.json({ error: 'No file uploaded' }, 400);
	}
	const res = await aws.fetch(new URL(`${c.env.B2_ENDPOINT}/${c.env.B2_BUCKET_NAME}/${path}${file.name}`).toString(), {
		method: 'PUT',
		body: new Uint8Array(await file.arrayBuffer()),
		headers: {
			'Content-Type': file.type
		}
	});
	console.log(res);
	if (!res.ok) {
		return res;
	}
	return c.json({ success: true });
});
app.post('/delete/:key{.+}', async c => {
	const currentUser = c.get('currentUser')!;
	const path = validatePath(c.req.param('key'));
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) && path.endsWith('/')) {
		return accessDenied(c);
	}
	const aws = new AwsClient({
		accessKeyId: c.env.B2_APPLICATION_KEY_ID,
		secretAccessKey: c.env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: c.env.B2_REGION
	});
	const res = await aws.fetch(new URL(`${c.env.B2_ENDPOINT}/${c.env.B2_BUCKET_NAME}/${path}`).toString(), { method: 'DELETE' });
	if (!res.ok) {
		return res;
	}
	return c.json({ success: true });
});
export default app;