import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";

export const Admin = () => {
	setTitle(tString('admin.name'));
	return <Card><h1>{t('admin.name')}</h1></Card>;
};