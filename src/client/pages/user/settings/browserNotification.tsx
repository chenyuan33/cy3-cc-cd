import { useState } from "hono/jsx";
import { t } from "../../../i18n";
import { Card } from "../../../components/card";
import './browserNotification.css';
import { Form, FormSelect } from "../../../components/form";
import { toast } from "../../../components/toast";

export const UserSettingsBrowserNotification = () => {
	localStorage.browserNotificationSettingsNotification ??= 'no';
	localStorage.browserNotificationSettingsPrivateMessage ??= 'no';
	const [_, _refresh] = useState(0);
	const refresh = () => _refresh(val => val + 1);
	return <Card>
		{Notification.permission === 'denied' ? <strong style={{ color: 'orange' }}>
			<i class='fa-solid fa-triangle-exclamation'></i>
			{t('user.settings.browserNotification.permissionDenied')}
		</strong> : null}
		{Notification.permission === 'default' ? <strong style={{ color: 'orange' }}>
			<i class='fa-solid fa-triangle-exclamation'></i>
			{t('user.settings.browserNotification.permissionUngranted')}
			<button onClick={() => {
				Notification.requestPermission();
				refresh();
			}}>{t('user.settings.browserNotification.permissionRequest')}</button>
		</strong> : null}
		<Form inert={Notification.permission !== 'granted'} class={Notification.permission === 'granted' ? '' : 'notAllowedSettings'}>
			<FormSelect id='notificationSelector' label={t('user.settings.browserNotification.notification.label')} options={(['detail', 'summary', 'no'] as const).map(type => ({
				value: type,
				label: t(`user.settings.browserNotification.notification.${type}`),
				selected: localStorage.browserNotificationSettingsNotification === type
			}))} />
			<FormSelect id='privateMessageSelector' label={t('user.settings.browserNotification.privateMessage.label')} options={(['detail', 'senderOnly', 'summary', 'no'] as const).map(type => ({
				value: type,
				label: t(`user.settings.browserNotification.privateMessage.${type}`),
				selected: localStorage.browserNotificationSettingsPrivateMessage === type
			}))} />
			<button onClick={() => {
				localStorage.browserNotificationSettingsNotification = (document.getElementById('notificationSelector')! as HTMLInputElement).value;
				localStorage.browserNotificationSettingsPrivateMessage = (document.getElementById('privateMessageSelector') as HTMLInputElement).value;
				toast(t('savedSuccessful'), 'success');
			}}>{t('save')}</button>
		</Form>
	</Card>;
};