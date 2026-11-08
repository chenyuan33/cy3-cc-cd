import { navigate } from "@w3cj/ruta";
import { Card } from "../../../components/card";
import { createConfirm } from "../../../components/dialog";
import { Form, FormInput } from "../../../components/form";
import { toast } from "../../../components/toast";
import { t, tString } from "../../../i18n";
import { useCurrentUserEmail } from "../../../utils/currentUser";

export const UserSettingsSecurity = () => {
	const currentUserEmail = useCurrentUserEmail();
	return <>
		<Card>
			<h2>{t('user.settings.security.changePassword.name')}</h2>
			<Form action='/api/user/settings/change-password' method='post' id='changePassword' onSubmit={async () => {
				if ((document.getElementById('newPassword')! as HTMLInputElement).value !== (document.getElementById('confirmPassword')! as HTMLInputElement).value) {
					toast(t('user.passwordNotMatch'), 'error');
					return false;
				} else {
					return await createConfirm(tString('user.confirmPassword')) as boolean;
				}
			}} onSuccess={() => toast(t('user.settings.security.changePassword.changedSuccessfully'), 'success')}>
				<FormInput id='oldPassword' name='old' label={t('user.settings.security.changePassword.old')} type='password' autocomplete='current-password' required />
				<FormInput id='newPassword' name='new' label={t('user.settings.security.changePassword.new')} type='password' autocomplete='new-password' required />
				<FormInput id='confirmPassword' name='confirm' label={t('user.settings.security.changePassword.confirm')} type='password' autocomplete='new-password' required />
				<button type='submit'>{t('user.settings.security.changePassword.name')}</button>
			</Form>
		</Card>
		<Card>
			<h2>{t('user.settings.security.changeEmail.name')}</h2>
			<p>{currentUserEmail
				? t('user.settings.security.changeEmail.current', { email: currentUserEmail })
				: t('user.settings.security.changeEmail.currentUnset')
			}</p>
			<Form action='/api/user/settings/change-email' method='post' onSuccess={data => navigate(`/user/settings/change-email/verify?email=${data.email}&code=${data.code}`)}>
				<FormInput id='password' name='password' label={t('userInfo.password')} type='password' autocomplete='current-password' required />
				<FormInput id='email' name='email' label={t('userInfo.email')} type='email' autocomplete='email' required />
				<button type='submit'>{t('next')}</button>
			</Form>
		</Card>
	</>;
};