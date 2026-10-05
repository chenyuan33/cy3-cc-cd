import { Hono } from "hono";
import { AwsClient } from "aws4fetch";
import type { AppEnv } from "../../types";
import { accessDenied, loginRequired, notFound } from "../errorPages";
import { permissionFile } from "../../settings";

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
app.post('/upload', async c => {
	const env = c.env as any, currentUser = c.get('currentUser')!;
	const aws = new AwsClient({
		accessKeyId: env.B2_APPLICATION_KEY_ID,
		secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: env.B2_REGION
	});
	const body = await c.req.parseBody();
	const path = body.path || '', file = body.file as File;
	if (typeof path !== 'string') {
		return notFound(c);
	}
	if (currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id)) {
		return accessDenied(c);
	}
	if (!file) {
		return c.json({ error: 'No file uploaded' }, 400);
	}
	await aws.fetch(new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/${path}${file.name}`).toString(), {
		method: 'PUT',
		body: new Uint8Array(await file.arrayBuffer()),
		headers: {
			'Content-Type': file.type
		}
	})
	return c.redirect('/file/' + path);
});
app.post('/delete/:key{.+}', async c => {
	const env = c.env as any, key = c.req.param('key');
	const aws = new AwsClient({
		accessKeyId: env.B2_APPLICATION_KEY_ID,
		secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		service: 's3',
		region: env.B2_REGION
	});
	await aws.fetch(new URL(`https://${env.B2_BUCKET_NAME}.${env.B2_ENDPOINT}/${key}`).toString(), { method: 'DELETE' });
	return c.redirect('/file/' + key.split('/').slice(0, -1).join('/') + '/');
});
export default app;