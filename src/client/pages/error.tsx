import type { FC } from "hono/jsx";
import { Card } from "../components/card";
import { t, tString } from "../i18n";
import type { JSX } from "hono/jsx/jsx-runtime";
import { useTitle } from "../utils/useTitle";

export const ErrorPage: FC<{ msg: string | JSX.Element }> = ({ msg }) => {
	useTitle(tString('error.somethingWentWrong'));
	return <Card>
		<h1>{t('error.somethingWentWrong')}</h1>
		<p>{msg}</p>
	</Card>;
};
export const NotFound = () => <ErrorPage msg={t(('error.notFound'))} />;
export const MissingParams = () => <ErrorPage msg={t(('error.missingParams'))} />;
export const AccessDenied = () => <ErrorPage msg={t(('error.accessDenied'))} />;
export const VerifyFailed = () => <ErrorPage msg={t(('error.verifyFailed'))} />;
export const LoginRequired = () => <ErrorPage msg={t(('error.loginRequired'))} />;
export const EmailVerifyRequired = () => <ErrorPage msg={t(('error.emailVerifyRequired'))} />;
export const Banned = () => <ErrorPage msg={t(('error.banned'))} />;
export const Muted = () => <ErrorPage msg={t(('error.muted'))} />;
export const AlreadyLoggedIn = () => <ErrorPage msg={t(('error.alreadyLoggedIn'))} />;
export const UsernameRequired = () => <ErrorPage msg={t(('error.usernameRequired'))} />;
export const RegisterUsernameLength = () => <ErrorPage msg={t(('user.registerUsernameLength'))} />;
export const RegisterUsernameExists = () => <ErrorPage msg={t(('user.registerUsernameExists'))} />;
export const EmailRequired = () => <ErrorPage msg={t(('error.emailRequired'))} />;
export const PasswordRequired = () => <ErrorPage msg={t(('error.passwordRequired'))} />;
export const NoSuchUsername = () => <ErrorPage msg={t(('error.noSuchUsername'))} />;
export const InvalidPassword = () => <ErrorPage msg={t(('error.invalidPassword'))} />;
export const InvalidEmail = () => <ErrorPage msg={t(('error.invalidEmail'))} />;
export const EmailUsed = () => <ErrorPage msg={t(('error.emailUsed'))} />;
export const TitleRequired = () => <ErrorPage msg={t(('error.titleRequired'))} />;
export const ContentRequired = () => <ErrorPage msg={t(('error.contentRequired'))} />;
export const CategoryRequired = () => <ErrorPage msg={t(('error.categoryRequired'))} />;
export const CategoryNotFound = () => <ErrorPage msg={t(('error.categoryNotFound'))} />;