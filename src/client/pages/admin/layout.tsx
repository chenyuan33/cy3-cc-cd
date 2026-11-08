import { type FC, type PropsWithChildren } from "hono/jsx";
import { useCurrentUser } from "../../utils/currentUser";
import { AccessDenied, LoginRequired } from "../error";
import { setTitle } from "../../utils/setTitle";
import { t, tString } from "../../i18n";
import { TabMenu } from "../../components/layout/tabMenu";
import { permissionAdmin } from "../../../settings";

export const AdminLayout: FC<PropsWithChildren<{}>> = ({ children }) => {
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionAdmin)) {
		return <AccessDenied />;
	}
	setTitle(tString('admin.name'));
	return <TabMenu tabs={[
		{ label: t('home.name'), href: '/admin/home', candidates: ['/admin'] },
		{ label: t('admin.domainRenew'), href: '/admin/domain-renew' },
		{ label: t('home.checkIn.name'), href: '/admin/check-in' },
		{ label: t('admin.ticketQuickReply'), href: '/admin/ticket-quick-reply' }
	]} title={<h1>{t('admin.name')}</h1>}>{children}</TabMenu>;
};