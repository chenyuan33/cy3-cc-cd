import type { FC } from "hono/jsx";
import { Card } from "./card";
import { Form } from "./form";
import { t } from "../i18n";

export const Pages: FC<{ currentPage: number, totalPage: number }> = ({ currentPage, totalPage }) => totalPage > 1
	? <Card><Form method='get' action='' style={{ display: 'flex', gap: '5px', 'align-items': 'center', 'justify-content': 'center' }}>
		{new Set([1, 2, 3, currentPage - 1, currentPage, currentPage + 1, totalPage - 2, totalPage - 1, totalPage])
		.values().toArray().filter(v => v > 0 && v <= totalPage).sort((a, b) => a - b).map(value => <a href='javascript:void(0)' onClick={() => {
			const url = new URL(location.href);
			url.searchParams.set('page', value.toString());
			location.href = url.toString();
		}} style={{
			'background-color': value === currentPage ? 'light-dark(blue, cyan)' : 'inherit',
			color: value === currentPage ? 'light-dark(white, black)' : 'inherit',
			padding: '2px',
			border: 'solid 1px light-dark(blue, cyan)',
			'border-radius': '5px',
			width: '20px',
			height: '20px',
			'text-align': 'center',
			'line-height': '20px'
		}}>{value}</a>)}
		<label for='page'>{t('goToPage')}</label>
		<input name='page' type='number' min='1' max={totalPage} value={currentPage} />
		<input type='submit'>{t('go')}</input>
	</Form></Card>
	: <></>;