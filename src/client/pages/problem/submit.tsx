import { navigate, useParams } from "@w3cj/ruta";
import { useCurrentUser } from "../../utils/currentUser";
import { LoginRequired } from "../error";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { Form, FormSelect } from "../../components/form";
import { programmingLangsToEditorLangs, supportedProgrammingLangs } from "../../../settings";
import { Editor, setLang } from "../../components/editor/editor";
import { useRef } from "hono/jsx";

export const ProblemSubmit = () => {
	const currentUser = useCurrentUser(), id = useParams<'/problem/:id/submit'>().id;
	const langSelectorRef = useRef<HTMLInputElement>(null);
	const loadLang = () => {
		if (langSelectorRef.current) {
			setLang('code', programmingLangsToEditorLangs[langSelectorRef.current.value as keyof typeof programmingLangsToEditorLangs]);
		}
	};
	loadLang();
	if (!currentUser) {
		return <LoginRequired />;
	}
	setTitle(tString('submit'));
	return <Card>
		<h1>{t('submit')}</h1>
		<Form action='/api/problem/submit' method='post' onSuccess={data => navigate('/record/' + data.id)}>
			<input type='hidden' name='pid' value={id} />
			<FormSelect label={t('language')} id='lang' name='lang' ref={langSelectorRef} options={supportedProgrammingLangs} onChange={loadLang} />
			<Editor id='code' name='code' height='calc(100vh - 425px)' />
			<button type='submit'>{t('submit')}</button>
		</Form>
	</Card>;
};