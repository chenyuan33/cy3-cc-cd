import { Hono } from "hono";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppEnv } from "../../types";
import { loginRequired } from "../errorPages";

const app = new Hono<AppEnv>();
app.post('/select-user-image', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	const kind = String(reqBody.kind || 'avatar');
	const rawPath = String(reqBody.path || '');
	const normalizedPath = rawPath.replace(/^\/+/, '').replace(/\\/g, '/');
	if (!normalizedPath.startsWith(`user/${currentUser.id}/`)) {
		return c.redirect('/user/settings');
	}
	if (!/\.(png|jpe?g|gif|webp|bmp)$/i.test(normalizedPath)) {
		return c.redirect('/user/settings');
	}
	if (kind === 'profile') {
		await env.db.prepare('UPDATE users SET profile_image_path = ? WHERE id = ?').bind(normalizedPath, currentUser.id).run();
	} else {
		await env.db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').bind(normalizedPath, currentUser.id).run();
	}
	return c.redirect('/user/settings');
});
app.post('/upload', async c => {
	const env = c.env as any;
	const client = new S3Client({
		region: env.B2_REGION,
		endpoint: env.B2_ENDPOINT,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		},
		forcePathStyle: true,
	});
	const body = await c.req.parseBody();
	const path = body.path || '', file = body.file as File;
	if (!file) {
		return c.json({ error: 'No file uploaded' }, 400);
	}
	await client.send(new PutObjectCommand({
		Bucket: env.B2_BUCKET_NAME,
		Key: `${path}${file.name}`,
		Body: new Uint8Array(await file.arrayBuffer()),
		ContentType: file.type,
	}));
	return c.redirect('/file/' + path);
});
app.get('/sign/:key{.+}', async (c) => {
	const env = c.env as any;
	const client = new S3Client({
		region: env.B2_REGION,
		endpoint: env.B2_ENDPOINT,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		},
		forcePathStyle: true,
	});
	return c.json({ url: await getSignedUrl(client, new GetObjectCommand({
		Bucket: env.B2_BUCKET_NAME,
		Key: c.req.param('key'),
	}), { expiresIn: 3600 }) });
});
app.post('/delete/:key{.+}', async c => {
	const env = c.env as any, key = c.req.param('key');
	const client = new S3Client({
		region: env.B2_REGION,
		endpoint: env.B2_ENDPOINT,
		credentials: {
			accessKeyId: env.B2_APPLICATION_KEY_ID,
			secretAccessKey: env.B2_SECRET_ACCESS_KEY,
		},
		forcePathStyle: true,
	});
	await client.send(new DeleteObjectCommand({
		Bucket: env.B2_BUCKET_NAME,
		Key: key,
	}));
	return c.redirect('/file/' + key.split('/').slice(0, -1).join('/') + '/');
});
export default app;