import { Hono } from "hono";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppEnv } from "../../types";

const app = new Hono<AppEnv>();
app.post("/upload", async (c) => {
	const env = c.env as any;
	console.log(env.B2_REGION);
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
	const file = body["file"] as File;
	if (!file) {
		return c.json({ error: "No file uploaded" }, 400);
	}
	const key = `uploads/${Date.now()}-${file.name}`;
	const buffer = await file.arrayBuffer();
	const command = new PutObjectCommand({
		Bucket: env.B2_BUCKET_NAME,
		Key: key,
		Body: new Uint8Array(buffer),
		ContentType: file.type,
	});
	await client.send(command);
	return c.json({ success: true, key, url: `/files/${key}` });
});
app.get("/sign/:key{.+}", async (c) => {
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
	const key = c.req.param("key");
	try {
		const command = new GetObjectCommand({
			Bucket: env.B2_BUCKET_NAME,
			Key: key,
		});
		const url = await getSignedUrl(client, command, { expiresIn: 3600 });
		return c.json({ url });
	} catch {
		return c.json({ error: "Failed to generate signed URL" }, 500);
	}
});
app.delete("/files/:key", async (c) => {
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
	const key = c.req.param("key");
	try {
		const command = new DeleteObjectCommand({
			Bucket: env.B2_BUCKET_NAME,
			Key: key,
		});
		await client.send(command);
		return c.json({ success: true });
	} catch {
		return c.json({ error: "Delete failed" }, 500);
	}
});
export default app;