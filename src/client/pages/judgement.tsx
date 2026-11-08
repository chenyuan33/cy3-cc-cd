import { useEffect, useState } from "hono/jsx";
import { t, tString } from "../i18n";
import { setTitle } from "../utils/setTitle";
import type { judgementInfo } from "../../types";
import { Card } from "../components/card";
import { Judgements } from "../components/judgement";

export const Judgement = () => {
	const [data, setData] = useState<judgementInfo[] | null>(null);
	useEffect(() => {
		(async () => setData(await (await fetch('/api/judgement')).json()))();
	}, []);
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('judgement.name'));
		return <Card>
			<h1>{t('judgement.name')}</h1>
			<p>{t('judgement.description')}</p>
			<p>{t('loading')}</p>
		</Card>;
	}
	setTitle(tString('judgement.name'));
	return <>
		<Card>
			<h1>{t('judgement.name')}</h1>
			<p>{t('judgement.description')}</p>
		</Card>
		<Judgements data={data} />
	</>;
};