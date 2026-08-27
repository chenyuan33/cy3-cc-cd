import { Hono } from "hono";
import { type AppEnv } from "../types";
import { Form } from "../components/form";
import { Card } from "../components/card";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const app = new Hono<AppEnv>();
app.get('/', c => {
	return c.render(<Card>
		<Form action='/api/file/upload' method='post' enctype='multipart/form-data' inputs={[{ id: 'file', name: 'file', required: true, main: { type: 'input', inputType: 'file' } }]} submit={{ content: 'submit' }} />
	</Card>, { title: 'upload file' });
});
app.get("/files/:key{.+}", async (c) => {
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
	const key = decodeURIComponent(c.req.param("key"));
	try {
		const command = new GetObjectCommand({
			Bucket: env.B2_BUCKET_NAME,
			Key: key,
		});
		const response = await client.send(command);
		const body = response.Body as ReadableStream;
		return new Response(body, {
			headers: {
				"Content-Type": response.ContentType || "application/octet-stream",
				"Content-Length": response.ContentLength?.toString() || "",
			},
		});
	} catch {
		return c.notFound();
	}
});
export default app;