import { type FC } from "hono/jsx";
import { FetchJsonButton, FetchJsonLink } from "./button";
import type { JSX } from "hono/jsx/jsx-runtime";
import { t } from "../i18n";
import { toast } from "./toast";

const ThemeApply: FC<{ themeId: number, text?: string | JSX.Element, FetchComponent: typeof FetchJsonLink & typeof FetchJsonButton }> = ({ themeId, text = t('apply'), FetchComponent }) => {
	return <>
		<FetchComponent href={'/api/theme/apply/' + themeId} text={text} redirect='' onSuccess={(data: { success: false, message: string } | { success: true }) => {
			if (data.success) {
				toast(t('appliedSuccessful'), 'success');
				location.reload();
			} else {
				toast(t('theme.notFound'), 'error');
			}
		}} />
	</>;
};
export const ThemeApplyLink: FC<{ themeId: number, text?: string | JSX.Element }> = props => <ThemeApply {...props} FetchComponent={FetchJsonLink} />;
export const ThemeApplyButton: FC<{ themeId: number, text?: string | JSX.Element }> = props => <ThemeApply {...props} FetchComponent={FetchJsonButton} />;