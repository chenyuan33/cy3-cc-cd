import { Hono } from "hono";
import { type AppEnv } from "../../types";
import { Form, FormInput } from "../components/form";
import { Card } from "../components/card";
import type { JSX } from "hono/jsx/jsx-runtime";
import { DeleteLink } from "../components/button";
import { permissionFile } from "../../settings";
import { t, tString } from "../i18n";
import { User } from "../components/user";
import { useCurrentUser } from "../utils/currentUser";
import { AccessDenied, LoginRequired } from "./error";
import { navigate, useParams } from "@w3cj/ruta";
import { useEffect, useRef, useState } from "hono/jsx";
import { subscribeUrlChange } from "../utils/urlSearch";
import { setTitle } from "../utils/setTitle";
import { toast } from "../components/toast";
import { A } from "../components/a";

const app = new Hono<AppEnv>();
export const File = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const currentUser = useCurrentUser(), path = decodeURIComponent(useParams<'/file/:path'>().path), page = parseInt(searchParams.get('page') || '1') || 1;
	const [data, setData] = useState<{
		CommonPrefixes: {
			Prefix: string
		}[],
		Contents: {
			Key: string,
			Size: number
		}[]
	} | null>(null);
	const reload = async () => setData(await (await fetch(`/api/file/list/${path}?page=${page}`)).json());
	useEffect(() => {
		reload();
	}, [path, page]);
	const goToFolderInputRef = useRef<HTMLInputElement>(null);
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionFile) || currentUser.id !== 1 && !path.startsWith('user/' + currentUser.id) && path.endsWith('/')) {
		return <AccessDenied />;
	}
	let currentDir = '/file/';
	const pathLinks = [];
	for (const dir of path.replace(/\/+$/, '').split('/')) {
		currentDir += dir + '/';
		if (currentDir !== '/file/user/') {
			pathLinks.push(<A href={currentDir}>{currentDir.match(/^\/file\/user\/\d+\/$/) ? t('userSpace', { user: <User user={parseInt(currentDir.slice(11, -1))} linkable={false} /> }) : dir}</A>);
		}
	}
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('file.name'));
		return <Card>
			<h1>{t('file.name')}</h1>
			{pathLinks.reduce((arr, cur) => {
				if (Array.isArray(arr)) {
					arr.push(<i class='fa-solid fa-angle-right'></i>);
					arr.push(cur);
					return arr;
				}
				return [cur];
			}, [] as JSX.Element[])}
			<Form action='/api/file/upload' method='post' enctype='multipart/form-data' style={{ display: 'flex', gap: '5px' }} onSuccess={() => {
				toast(t('operationSuccessful'), 'success');
				reload();
			}}>
				<FormInput id='file' name='file' required type='file' />
				<input name='path' type='hidden' value={path} />
				<button type='submit'>{t('upload')}</button>
			</Form>
			<br />
			<label for='goToFolder'>{t('file.goToFolder')}</label>
			&nbsp;
			<input id='goToFolder' type='text' ref={goToFolderInputRef} />
			&nbsp;
			<button onClick={() => {
				if (goToFolderInputRef.current) {
					navigate(goToFolderInputRef.current.value + '/');
				}
			}}>{t('go')}</button>
			<p>{t('loading')}</p>
		</Card>;
	}
	setTitle(tString('file.name'));
	return <Card>
		<h1>{t('file.name')}</h1>
		{pathLinks.reduce((arr, cur) => {
			if (Array.isArray(arr)) {
				arr.push(<i class='fa-solid fa-angle-right'></i>);
				arr.push(cur);
				return arr;
			}
			return [cur];
		}, [] as JSX.Element[])}
		<Form action='/api/file/upload' method='post' enctype='multipart/form-data' style={{ display: 'flex', gap: '5px' }} onSuccess={() => {
			toast(t('operationSuccessful'), 'success');
			reload();
		}}>
			<FormInput id='file' name='file' required type='file' />
			<input name='path' type='hidden' value={path} />
			<button type='submit'>{t('upload')}</button>
		</Form>
		<br />
		<label for='goToFolder'>{t('file.goToFolder')}</label>
		&nbsp;
		<input id='goToFolder' type='text' ref={goToFolderInputRef} />
		&nbsp;
		<button onClick={() => {
			if (goToFolderInputRef.current) {
				navigate(goToFolderInputRef.current.value + '/');
			}
		}}>{t('go')}</button>
		{(data.CommonPrefixes || []).length || (data.Contents || []).length ? <table style={{ width: '100%' }}>
			<thead><tr>
				<th style={{ textAlign: 'left', width: '100%' }}>{t('file.fileName')}</th>
				<th style={{ whiteSpace: 'nowrap' }}>{t('file.size')}</th>
				<th style={{ whiteSpace: 'nowrap' }}>{t('operations')}</th>
			</tr></thead>
			<tbody>
				{(data.CommonPrefixes || []).map(({ Prefix }) => Prefix ? <tr>
					<td colspan={3}><A href={'/file/' + Prefix}>{Prefix.substring(path.length)}</A></td>
				</tr> : <></>)}
				{(data.Contents || []).map(({ Key, Size }) => Key ? <tr>
					<td><a href={'/api/file/get/' + Key}>{Key.substring(path.length)}</a></td>
					<td>{Size}</td>
					<td><DeleteLink href={'/api/file/delete/' + Key} redirect='' onSuccess={() => {
						toast(t('deletedSuccessful'), 'success');
						reload();
					}} /></td>
				</tr> : <></>)}
			</tbody>
		</table> : <p>{t('file.folderEmpty')}</p>}
	</Card>;
};
export default app;