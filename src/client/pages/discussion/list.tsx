import { useEffect, useRef, useState } from "hono/jsx";
import { PostButton } from "../../components/button";
import { Card } from "../../components/card";
import { Form, FormSelect, type FormHandle } from "../../components/form";
import { SidebarLayout } from "../../components/layout/sidebar";
import { t, tString } from "../../i18n";
import { discussionCategories, discussionCategoriesKey, type discussionBasicInfo, type discussionCategoriesType } from "../../../routes/api/discussion";
import { CategoryNotFound } from "../error";
import { useTitle } from "../../utils/useTitle";
import { Pages } from "../../components/pages";
import { DiscussionItem } from "../../components/discussionItem";
import { subscribeUrlChange } from "../../utils/urlSearch";

export const DiscussionList = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const category = searchParams.get('category');
	const [data, setData] = useState<{
		discussion: discussionBasicInfo[],
		total: number
	} | null>(null);
	const perPage = 20;
	let cancelled = false;
	const reload = async () => {
		const data = await (await fetch(`/api/discussion/list?perpage=${perPage}&page=${page}` + (category ? '&category=' + category : ''))).json();
		if (!cancelled) {
			setData(data);
		}
	};
	useEffect(() => { reload(); return () => cancelled = true; }, [category, page]);
	if (category && !(category in discussionCategories)) {
		return <CategoryNotFound />;
	}
	const filterFormRef = useRef<FormHandle>(null);
	const sidebar = <Card>
		<h1>{t('discussion.name')}</h1>
		<PostButton href={'/discussion/post' + (category ? '?category=' + category : '')} />
		<Form action='/discussion' method='get' alignInput='100px' ref={filterFormRef}>
			<FormSelect key={'category-' + category} id='category' name='category' label={t('category')} options={[
				{ value: '', label: t('allCategories'), selected: !category },
				...(discussionCategoriesKey.map(key => ({ value: key, label: t(`discussion.categoryName.${key}`), selected: category === key })))
			]} onChange={() => filterFormRef.current?.requestSubmit()} />
			<button type='submit'>{t('filter')}</button>
		</Form>
	</Card>;
	useTitle((category ? tString(`discussion.categoryName.${category as discussionCategoriesType}`) + ' - ' : '') + tString('discussion.name'));
	if (!data) {
		return <SidebarLayout sidebar={sidebar}>
			<Card>{t('loading')}</Card>
		</SidebarLayout>;
	}
	return <SidebarLayout sidebar={sidebar}>
		{data.discussion.length ? data.discussion.map(item => <DiscussionItem discussion={item} key={'discussion-item-' + item.id} />) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>}
		<Pages currentPage={page} totalPage={Math.ceil(data.total / perPage)} />
	</SidebarLayout>;
};