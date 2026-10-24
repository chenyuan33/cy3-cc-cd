import { useParams } from "@w3cj/ruta";
import { useContext, useEffect, useState, type FC, type PropsWithChildren } from "hono/jsx";
import { Card } from "../../../components/card";
import { t, tString } from "../../../i18n";
import { NotFound } from "../../error";
import type { userInfo } from "../../../../types";
import { getDisplayUsernameString, User } from "../../../components/user";
import { TabMenu } from "../../../components/layout/tabMenu";
import { setTitle } from "../../../utils/setTitle";
import { createContext } from "hono/jsx";

const refreshUserDetailLayoutContext = createContext<{ refresh: () => void }>({ refresh(){} });
export const useRefreshUserDetailLayoutContext = () => useContext(refreshUserDetailLayoutContext);
export const UserDetailLayout: FC<PropsWithChildren<{}>> = ({ children }) => {
	const id = parseInt(useParams<'/user/:id/*'>().id);
	const [data, setData] = useState<{ result: userInfo } | null>(null);
	useEffect(() => {
		if (id) {
			(async () => setData(await (await fetch(`/api/user/detail/${id}`)).json()))();
		}
	}, [id]);
	if (!id) {
		return <NotFound />
	}
	if (!data) {
		return <Card><h1>{t('loading')}</h1></Card>;
	}
	if (!data.result) {
		return <NotFound />;
	}
	setTitle(tString('user.profile.title', { username: getDisplayUsernameString(data.result) }));
	return <refreshUserDetailLayoutContext.Provider value={{ refresh() {
		(async () => setData(await (await fetch(`/api/user/detail/${id}`)).json()))();
	} }}><TabMenu tabs={[
		{ label: t('user.profile.home'), href: `/user/${id}/home`, candidates: [`/user/${id}`] },
		{ label: t('user.profile.feed'), href: `/user/${id}/feed` },
		{ label: t('user.profile.discussion'), href: `/user/${id}/discussion` },
		{ label: t('user.profile.theme'), href: `/user/${id}/theme` },
		{ label: t('user.profile.judgement'), href: `/user/${id}/judgement` },
		{ label: t('user.profile.admin'), href: `/user/${id}/admin` }
	]} title={<User user={data.result} />}>{children}</TabMenu></refreshUserDetailLayoutContext.Provider>;
};