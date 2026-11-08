import { navigate, useParams } from "@w3cj/ruta";
import { defaultTheme } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormCheckbox, FormInput, FormSelect } from "../../components/form";
import { t, tString } from "../../i18n";
import { useCurrentUser } from "../../utils/currentUser";
import { setTitle } from "../../utils/setTitle";
import { LoginRequired, NotFound } from "../error";
import './create.css';
import { DeleteButton } from "../../components/button";
import { toast } from "../../components/toast";
import en_us from "../../../i18n/en_us";
import { ThemeApplyButton } from "../../components/themeApply";
import { useEffect, useRef, useState } from "hono/jsx";
import type { themeBasicInfo } from "../../../types";

export const ThemeCreate = () => {
	const currentUser = useCurrentUser(), params = useParams<'/theme/create' | '/theme/:id'>();
	const id = 'id' in params ? parseInt(params.id) : null;
	const [theme, setTheme] = useState<{ info: themeBasicInfo & { uid: number, name: string } | null } | null>(null);
	useEffect(() => {
		if (!currentUser) {
			return;
		}
		if (id) {
			(async () => setTheme(await (await fetch('/api/theme/detail/' + id)).json()))();
		} else {
			setTheme({ info: { uid: currentUser.id, name: '', ...defaultTheme } });
		}
	}, [id]);
	const formRef = useRef<HTMLFormElement>(null);
	const updateUseBgImage = () => {
		if (!formRef.current) {
			return;
		}
		if (new FormData(formRef.current).get('useBgImage')) {
			formRef.current.classList.add('usebgimage');
			formRef.current.classList.remove('usebgcolor');
			Array.from(document.querySelectorAll('.onbgcolor input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = false);
			Array.from(document.querySelectorAll('.onbgimage input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = true);
		} else {
			formRef.current.classList.remove('usebgimage');
			formRef.current.classList.add('usebgcolor');
			Array.from(document.querySelectorAll('.onbgcolor input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = true);
			Array.from(document.querySelectorAll('.onbgimage input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = false);
		}
	}, updateBgImageSizeX = () => {
		if (!formRef.current) {
			return;
		}
		if (new FormData(formRef.current).get('bgImageSizeX') === 'custom') {
			formRef.current.classList.add('usebgimagexcustom');
			Array.from(document.querySelectorAll('.onbgimagexcustom input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = true);
		} else {
			formRef.current.classList.remove('usebgimagexcustom');
			Array.from(document.querySelectorAll('.onbgimagexcustom input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = false);
		}
	}, updateBgImageSizeY = () => {
		if (!formRef.current) {
			return;
		}
		if (new FormData(formRef.current).get('bgImageSizeY') === 'custom') {
			formRef.current.classList.add('usebgimageycustom');
			Array.from(document.querySelectorAll('.onbgimageycustom input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = true);
		} else {
			formRef.current.classList.remove('usebgimageycustom');
			Array.from(document.querySelectorAll('.onbgimageycustom input:not([type="checkbox"])')).forEach(el => (el as HTMLInputElement).required = false);
		}
	};
	useEffect(() => {
		updateUseBgImage();
		updateBgImageSizeX();
		updateBgImageSizeY();
	}, [id]);
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!theme) {
		setTitle(tString('loading') + ' - ' + tString('theme.edit'));
		return <Card>
			<h1>{t('theme.edit')}</h1>
			<p>{t('loading')}</p>
		</Card>;
	}
	if (!theme.info) {
		return <NotFound />;
	}
	setTitle(id ? tString('theme.edit') + ' - ' + theme.info.name : tString('theme.create'));
	return <Card>
		<h1>{id ? <>{t('theme.edit')} - {theme.info.name}</> : t('theme.create')}</h1>
		{id ? <ThemeApplyButton themeId={id} /> : null}
		<Form action='/api/theme/create' method='post' class='usebgcolor' ref={formRef} onSuccess={(data: { success: false, message: string } | { success: true, id?: number }) => {
			if (data.success) {
				if ('id' in data) {
					toast(t('createdSuccessful'), 'success');
					navigate('/theme/' + data.id);
				} else {
					toast(t('savedSuccessful'), 'success');
				}
			} else {
				toast(data.message, 'error');
			}
		}}>
			<FormInput id='name' name='name' label={t('theme.themeName')} required type='text' value={theme.info.name} />
			<FormCheckbox id='useBgImage' name='useBgImage' label={t('theme.useBgImage')} onChange={updateUseBgImage} checked={!!theme.info.usebgimage} />
			<div class='onbgimage'>
				<FormCheckbox id='bgImageRepeatX' name='bgImageRepeatX' label={t('theme.bgImageRepeat.x')} checked={!!theme.info.bgImageRepeatX} />
				<FormCheckbox id='bgImageRepeatY' name='bgImageRepeatY' label={t('theme.bgImageRepeat.y')} checked={!!theme.info.bgImageRepeatY} />
				<FormSelect id='bgImageSizeX' name='bgImageSizeX' label={t('theme.bgImageSize.x')} options={[
					{ value: 'auto', label: t('theme.bgImageSize.auto'), selected: theme.info.bgImageSizeX === 'auto' },
					{ value: 'cover', label: t('theme.bgImageSize.cover'), selected: theme.info.bgImageSizeX === 'cover' },
					{ value: 'contain', label: t('theme.bgImageSize.contain'), selected: theme.info.bgImageSizeX === 'contain' },
					{ value: 'custom', label: t('theme.bgImageSize.custom'), selected: theme.info.bgImageSizeX === 'custom' }
				]} onChange={updateBgImageSizeX} />
				<FormInput id='bgImageSizeXCustom' name='bgImageSizeXCustom' label={t('theme.bgImageSizeCustom.x')} class='onbgimagexcustom' type='number' min={0} value={theme.info.bgImageSizeXCustom.toString() || '0'} />
				<FormSelect id='bgImageSizeXCustomUnit' name='bgImageSizeXCustomUnit' class='onbgimagexcustom' options={Object.entries(en_us.theme.lengthUnits).map(([value, label]) => ({ value, label: `${value} (${label})`, checked: theme.info && theme.info.bgImageSizeXCustomUnit === value }))} />
				<FormSelect id='bgImageSizeY' name='bgImageSizeY' label={t('theme.bgImageSize.y')} options={[
					{ value: 'auto', label: t('theme.bgImageSize.auto'), selected: theme.info.bgImageSizeY === 'auto' },
					{ value: 'cover', label: t('theme.bgImageSize.cover'), selected: theme.info.bgImageSizeY === 'cover' },
					{ value: 'contain', label: t('theme.bgImageSize.contain'), selected: theme.info.bgImageSizeY === 'contain' },
					{ value: 'custom', label: t('theme.bgImageSize.custom'), selected: theme.info.bgImageSizeY === 'custom' }
				]} onChange={updateBgImageSizeY} />
				<FormInput id='bgImageSizeYCustom' name='bgImageSizeYCustom' label={t('theme.bgImageSizeCustom.y')} class='onbgimageycustom' type='number' min={0} value={theme.info.bgImageSizeYCustom.toString() || '0'} />
				<FormSelect id='bgImageSizeYCustomUnit' name='bgImageSizeYCustomUnit' class='onbgimageycustom' options={Object.entries(en_us.theme.lengthUnits).map(([value, label]) => ({ value, label: `${value} (${label})`, checked: theme.info && theme.info.bgImageSizeYCustomUnit === value }))} />
			</div>
			<FormCheckbox id='useFrostedGlass' name='useFrostedGlass' label={t('theme.useFrostedGlass')} checked={!!theme.info.useFrostedGlass} />
			<FormSelect id='editor' name='editor' label={t('theme.editor')} options={[
				{ value: 'CodeMirror', label: 'CodeMirror', selected: theme.info.editor === 'CodeMirror' },
				{ value: 'MonacoEditor', label: 'MonacoEditor', selected: theme.info.editor === 'MonacoEditor' }
			]} />
			<h2>{t('theme.lightTheme')}</h2>
			<FormInput id='light_fgcolor' name='light_fgcolor' label={t('theme.fgcolor')} required type='color' value={theme.info.light_fgcolor || '#000000'} />
			<FormInput id='light_bgcolor' class='onbgcolor' name='light_bgcolor' label={t('theme.bgcolor')} required type='color' value={theme.info.light_bgcolor || '#ffffff'} />
			<FormInput id='light_bgimage' class='onbgimage' name='light_bgimage' label={t('theme.bgimage')} type='url' value={theme.info.light_bgimage || ''} />
			<h2>{t('theme.darkTheme')}</h2>
			<FormInput id='dark_fgcolor' name='dark_fgcolor' label={t('theme.fgcolor')} required type='color' value={theme.info.dark_fgcolor || '#ffffff'} />
			<FormInput id='dark_bgcolor' class='onbgcolor' name='dark_bgcolor' label={t('theme.bgcolor')} required type='color' value={theme.info.dark_bgcolor || '#000000'} />
			<FormInput id='dark_bgimage' class='onbgimage' name='dark_bgimage' label={t('theme.bgimage')} type='url' value={theme.info.dark_bgimage || ''} />
			<button type='submit'>{id ? t('theme.saveAsNew') : t('theme.create')}</button>
			{id && (theme.info.uid === currentUser.id || currentUser.id === 1) ? <>
				<button type='submit' formaction={'/api/theme/save/' + id}>{t('save')}</button>
				<DeleteButton href={'/api/theme/delete/' + id} redirect='' onSuccess={() => toast(t('deletedSuccessful'), 'success')} />
			</> : null}
		</Form>
	</Card>;
};