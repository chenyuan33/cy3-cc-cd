import { createContext, useContext, type FC, type PropsWithChildren } from "hono/jsx";
import type { themeBasicInfo, userInfo } from "../../types";
import { defaultTheme } from "../../settings";

type CurrentUserContextType = { user: userInfo & { email: string | null } | null, usingTheme: themeBasicInfo };
const CurrentUserContext = createContext<CurrentUserContextType>({
	user: typeof window === 'undefined' ? null : window.data.currentUser,
	usingTheme: typeof window === 'undefined' ? defaultTheme : window.data.usingTheme
});
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
export const CurrentUserProvider : FC<PropsWithChildren<{}>> = ({ children }) => <CurrentUserContext.Provider value={{
	user: typeof window === 'undefined' ? null : window.data.currentUser,
	usingTheme: typeof window === 'undefined' ? defaultTheme : window.data.usingTheme
}}>{children}</CurrentUserContext.Provider>;