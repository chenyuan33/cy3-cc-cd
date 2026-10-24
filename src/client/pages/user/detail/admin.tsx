import { useParams } from "@w3cj/ruta";
import { useEffect, useState } from "hono/jsx";
import { Card } from "../../../components/card";
import { t } from "../../../i18n";
import { AccessDenied, LoginRequired, NotFound } from "../../error";
import { subscribeUrlChange } from "../../../utils/urlSearch";
import type { userInfo } from "../../../../types";
import { useCurrentUser } from "../../../utils/currentUser";
import { permissionAdmin, permissionCount, type allPermissions } from "../../../../settings";
import { Form, FormCheckbox, FormInput } from "../../../components/form";
import { toast } from "../../../components/toast";
import { useRefreshUserDetailLayoutContext } from "./layout";

export const UserDetailAdmin = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const id = useParams<'/user/:id/*'>().id;
	const [data, setData] = useState<{ result: userInfo } | null>(null);
	const refreshUserDetailLayoutContext = useRefreshUserDetailLayoutContext().refresh;
	const load = () => {
		if (id) {
			(async () => setData(await (await fetch(`/api/user/detail/${id}`)).json()))();
		}
	};
	useEffect(load, [id, page]);
	const reload = () => {
		load();
		refreshUserDetailLayoutContext();
	};
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionAdmin)) {
		return <AccessDenied />;
	}
	if (!id) {
		return <NotFound />;
	}
	if (!data) {
		return <Card><h1>{t('loading')}</h1></Card>;
	}
	if (!data.result) {
		return <NotFound />;
	}
	if ((data.result.permission & permissionAdmin) && currentUser.id !== 1) {
		return <AccessDenied />;
	}
	return <>
		<Card>
			<Form action='/api/admin/user/warn' method='post' onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload()
			}}>
				<input name='uid' type='hidden' value={data.result.id.toString()} />
				<FormInput name='comment' type='text' required />
				<button type='submit'>{t('warn')}</button>
			</Form>
		</Card>
		<Card>
			<Form action='/api/admin/user/name-violation' method='post' onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload()
			}}>
				<input type='hidden' name='uid' value={data.result.id.toString()} />
				<FormInput type='text' name='comment' required label={t('reason')} />
				<button type='submit'>{t('user.toggleUsernameViolation')}</button>
			</Form>
		</Card>
		<Card>
			<Form action='/api/admin/user/permission-set' method='post' onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload()
			}}>
				<input type='hidden' name='uid' value={data.result.id.toString()} />
				<FormInput type='text' name='comment' label={t('reason')} required />
				{Array.from({ length: permissionCount }, (_, i) => i).map(x => 1 << x).filter(x => x !== permissionAdmin || currentUser.id === 1).map(permissionId => <FormCheckbox id={'permission-' + permissionId} name={'p' + permissionId} label={t(`permission.${permissionId as allPermissions}`)} checked={!!(data.result.permission & permissionId)} />)}
				<button type='submit'>{t('save')}</button>
			</Form>
		</Card>
	</>;
};