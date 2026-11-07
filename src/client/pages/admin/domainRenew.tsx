import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";

export const AdminDomainRenew = () => {
	const [data, setData] = useState<any>(null);
	useEffect(() => {
		fetch('/api/admin/domain-renew').then(res => res.json()).then(json => setData(json));
	}, []);
	if (data === null) {
		setTitle(tString('loading') + ' - ' + tString('admin.domainRenew'));
		return <Card><p>{t('loading')}</p></Card>;
	}
	setTitle(tString('admin.domainRenew'));
	return <Card><pre><code>{JSON.stringify(data, null, '\t')}</code></pre></Card>;
};