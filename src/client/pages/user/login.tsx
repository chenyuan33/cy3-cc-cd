import { navigate } from "@w3cj/ruta";
import { Card } from "../../components/card";
import { Form, FormInput } from "../../components/form";
import { reloadCurrentUser, useCurrentUser } from "../../currentUser";
import { t, tString } from "../../i18n";
import { useTitle } from "../../useTitle";
import { AlreadyLoggedIn } from "../error"

export const Login = () => {
	const currentUser = useCurrentUser();
	if (currentUser) {
		return <AlreadyLoggedIn />;
	}
	useTitle(tString('user.login'));
	return <div style={{
		display: 'grid',
		'place-items': 'center',
		'min-height': '100vh'
	}}>
		<Card style={{
			'min-width': '400px',
			display: 'flex',
			'flex-direction': 'column',
			'align-items': 'center',
			position: 'relative'
		}}>
			<h1>{t('user.login')}</h1>
			<Form action='/api/user/login' method='post' onSuccess={() => {
				location.href = '/';
			}}>
				<FormInput id='name' name='name' label={tString('userInfo.username')} type='text' autocomplete='username' required />
				<FormInput id='password' name='password' label={tString('userInfo.password')} type='password' autocomplete='current-password' required />
				<button type='submit'>{t('user.login')}</button>
			</Form>
			<p>{t('user.loginToRegister')}</p>
		</Card>
	</div>;
};