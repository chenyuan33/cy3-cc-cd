import { useParams } from "@w3cj/ruta";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../../components/card";
import { t } from "../../../i18n";
import { NotFound } from "../../error";
import type { userInfo } from "../../../../types";
import { Time } from "../../../components/time";

export const UserDetailHome = () => {
	const id = useParams<'/user/:id/*'>().id;
	const [data, setData] = useState<{ result: userInfo } | null>(null);
	useEffect(() => {
		if (id) {
			(async () => setData(await (await fetch(`/api/user/detail/${id}`)).json()))();
		}
	}, [id]);
	if (!id) {
		return <NotFound />;
	}
	if (!data) {
		return <Card><h1>{t('loading')}</h1></Card>;
	}
	if (!data.result) {
		return <NotFound />;
	}
	return <Card><table><tbody>
		<tr><th>{t('userInfo.uid')}</th><td>{id}</td></tr>
		<tr><th>{t('userInfo.registeredAt')}</th><td><Time time={data.result.created_at} /></td></tr>
	</tbody></table></Card>;
};