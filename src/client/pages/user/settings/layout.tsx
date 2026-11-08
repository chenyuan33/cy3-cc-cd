import { type FC, type PropsWithChildren } from "hono/jsx";
import { t, tString } from "../../../i18n";
import { TabMenu } from "../../../components/layout/tabMenu";
import { setTitle } from "../../../utils/setTitle";
import { useCurrentUser } from "../../../utils/currentUser";
import { LoginRequired } from "../../error";

export const UserSettingsLayout: FC<PropsWithChildren<{}>> = ({ children }) => {
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	setTitle(tString('user.settings.name'));
	return <TabMenu tabs={[
		{ label: t('user.settings.browserNotification.name'), href: '/user/settings/browserNotification', candidates: ['/user/settings'] },
		{ label: t('user.settings.username.name'), href: '/user/settings/username' },
		{ label: t('user.settings.security.name'), href: '/user/settings/security' }
	]} title={<h1>{t('user.settings.name')}</h1>}>{children}</TabMenu>;
};