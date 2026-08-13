import type { FC } from "hono/jsx";
import type { ContextType } from "../types";
import { Card } from "./card";
import { getText } from "../translations";
import { createSubmitHandler } from "./form";

export const Pages: FC<{ c: ContextType, currentPage: number, totalPage: number }> = ({ c, currentPage, totalPage }) => totalPage > 1
	? <Card><form method='get' action='' style={{ display: 'flex', gap: '5px', 'align-items': 'center', 'justify-content': 'center' }} onsubmit={createSubmitHandler()}>
		{new Set([1, 2, 3, currentPage - 1, currentPage, currentPage + 1, totalPage - 2, totalPage - 1, totalPage])
		.values().toArray().filter(v => v > 0 && v <= totalPage).sort((a, b) => a - b).map(value => <a href={`javascript:setPage(${value})`} style={{
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
		<label for='page'>{getText(c.get('locale'), 'goToPage')}</label>
		<input type='number' min='1' max={totalPage} value={currentPage} />
		<button type='submit'>{getText(c.get('locale'), 'go')}</button>
	</form></Card>
	: <></>;