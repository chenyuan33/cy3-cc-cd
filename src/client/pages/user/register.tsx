import "./register.css";
import { Card } from "../../components/card";
import { Form, FormInput } from "../../components/form";
import { reloadCurrentUser, useCurrentUser } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { AlreadyLoggedIn } from "../error";
import { createAlert } from "../../components/dialog";
import { navigate } from "@w3cj/ruta";
import { toast } from "../../components/toast";
import { A } from "../../components/a";

export const Register = () => {
	const currentUser = useCurrentUser();
	if (currentUser) {
		return <AlreadyLoggedIn />;
	}
	setTitle(tString('user.register'));
	let ckusedTimeout: NodeJS.Timeout;
	const checks = {
		length: (x: string) => x.length >= 3 && x.length <= 30,
		used: (x: string) => !checks.length(x) || null
	};
	return <div style={{
		display: 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		'min-height': '100vh'
	}}>
		<div style={{
			display: 'flex',
			'flex-wrap': 'wrap',
			gap: '20px'
		}}>
			<Card style={{
				'min-width': '300px',
				display: 'flex',
				'flex-direction': 'column',
				'align-items': 'center',
				position: 'relative'
			}}>
				<h1>{t('user.register')}</h1>
				<Form action='/api/user/register' method='post' alignInput='100px' onSubmit={() => {
					if ((document.getElementById('password')! as HTMLInputElement).value !== (document.getElementById('confirmPassword')! as HTMLInputElement).value) {
						toast(t('user.passwordNotMatch'), 'error');
						return false;
					}
				}} onSuccess={() => {
					location.href = '/';
				}}>
					<ul id='namechecklist'>
						<li><i class='fa-solid fa-xmark check-failed' id='namecheck-length'></i>{t('user.registerUsernameLength')}</li>
						<li><i class='fa-solid fa-check check-success' id='namecheck-used'></i>{t('user.registerUsernameExists')}</li>
					</ul>
					<FormInput id='name' name='name' label={tString('userInfo.username')} type='text' onInput={async () => {
						const uname = (document.getElementById('name')! as HTMLInputElement).value;
						document.querySelector('button')!.disabled = true;
						Object.entries(checks).forEach(([name, check]) => {
							const ele = document.getElementById('namecheck-' + name)!;
							switch (check(uname)) {
								case true:
									ele.className = 'fa-solid fa-check check-success';
									break;
								case false:
									ele.className = 'fa-solid fa-xmark check-failed';
									break;
								default:
									ele.className = 'fa-solid fa-spin fa-spinner check-loading';
									if (name === 'used') {
										clearTimeout(ckusedTimeout);
										ckusedTimeout = setTimeout(async () => {
											if (((await (await fetch('/api/user/search?user=' + uname)).json()) as { exists: boolean }).exists) {
												ele.className = 'fa-solid fa-xmark check-failed';
												document.querySelector('button')!.disabled = true;
											} else {
												ele.className = 'fa-solid fa-check check-success';
												document.querySelector('button')!.disabled = false;
											}
										}, 1000);
									}
									break;
							}
						});
					}} autocomplete='username' required />
					<FormInput id='password' name='password' label={tString('userInfo.password')} type='password' autocomplete='new-password' required />
					<FormInput id='confirmPassword' name='confirmPassword' label={tString('user.confirmPassword')} type='password' autocomplete='new-password' required />
					<button type='submit'>{t('user.register')}</button>
				</Form>
				<p>{t('user.registerToLogin', { link: <A href='/user/login'>{t('user.registerToLoginLink')}</A> })}</p>
			</Card>
		</div>
	</div>;
};