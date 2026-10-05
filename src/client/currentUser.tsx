import { createContext, useContext, useEffect, useState, type FC, type PropsWithChildren } from "hono/jsx";
import type { themeInfo, userInfo } from "../types";
import { defaultTheme } from "../settings";
import { useLocation } from "@w3cj/ruta";

type CurrentUserContextType = { user: userInfo & { email: string } | null, usingTheme: themeInfo, reload: () => Promise<void> };
const CurrentUserContext = createContext<CurrentUserContextType>({ user: null, usingTheme: defaultTheme, reload: async () => {} });
const _useCurrentUser = () => useContext(CurrentUserContext);
export const useCurrentUser = () => {
	const _currentUser = _useCurrentUser().user;
	if (!_currentUser) {
		return null;
	}
	const { email, ...currentUser } = _currentUser;
	if (!Object.entries(currentUser).length) {
		return null;
	}
	return currentUser;
};
export const useCurrentUserEmail = () => {
	const _currentUser = _useCurrentUser().user;
	if (!_currentUser) {
		return null;
	}
	return _currentUser.email;
};
export const useUsingTheme = () => _useCurrentUser().usingTheme;
export const reloadCurrentUser = () => _useCurrentUser().reload();
export const CurrentUserProvider : FC<PropsWithChildren<{}>> = ({ children }) => {
	const [data, setData] = useState<{ user: userInfo & { email: string } | null, usingTheme: themeInfo, reload: () => Promise<void> }>({ user: null, usingTheme: defaultTheme, reload: async () => {} });
	const reload = async () => setData({reload, ...await (await fetch('/api/currentUser')).json()});
	useEffect(() => {reload()}, [useLocation().location]);
	return <CurrentUserContext.Provider value={data}>{children}</CurrentUserContext.Provider>;
};