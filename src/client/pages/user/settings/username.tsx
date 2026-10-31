import { permissionAdmin } from "../../../../settings";
import { Card } from "../../../components/card";
import { Form, FormInput } from "../../../components/form";
import { toast } from "../../../components/toast";
import { t } from "../../../i18n";
import { useCurrentUser } from "../../../utils/currentUser";

export const UserSettingsUsername = () => {
	const currentUser = useCurrentUser()!;
	return <Card>
		<Form action='/api/user/settings/username' method='post' onSuccess={() => toast(t('savedSuccessful'), 'success')}>
			<FormInput id='username' name='username' label={t('userInfo.username')} type='text' value={currentUser.name} required />
			<FormInput id='nameColorLight' name='nameColorLight' label={t('user.settings.username.changeColorLight')} type='color' value={'#' + currentUser.name_color_light} required />
			<FormInput id='nameColorDark' name='nameColorDark' label={t('user.settings.username.changeColorDark')} type='color' value={'#' + currentUser.name_color_dark} required />
			{((currentUser.permission & permissionAdmin) ? <FormInput id='tag' name='tag' label={t('user.tag')} type='text' value={currentUser.tag || ''} /> : null)}
			<button type='submit'>{t('save')}</button>
		</Form>
	</Card>;
};