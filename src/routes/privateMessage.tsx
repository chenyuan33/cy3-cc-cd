import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getText } from "../translations";
import { Card } from "../components/card";

const app = new Hono<AppEnv>();
app.get('/', async c => {
	return c.render(<Card>
		<h1>{getText(c.get('locale'), 'privateMessage')}</h1>
		
	</Card>, { title: getText(c.get('locale'), 'privateMessage') });
});
export default app;