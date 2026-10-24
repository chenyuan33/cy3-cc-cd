import type { FC, PropsWithChildren } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import { A } from "../a";
import { Card } from "../card";
import { SidebarLayout } from "./sidebar";

export const TabMenu: FC<PropsWithChildren<{ tabs: { label: JSX.Element, href: string, candidates?: string[] }[], title: JSX.Element }>> = ({ tabs, title, children }) => <>
	<Card><h1>{title}</h1></Card>
	<SidebarLayout sidebar={<Card>{tabs.map(({ label, href, candidates }) => href === location.pathname || candidates?.includes(location.pathname) ? <h2 style={{ color: 'orange', borderLeft: 'solid 5px', paddingLeft: '20px' }}>
		{label}
	</h2> : <h2 style={{ paddingLeft: '25px' }}><A href={href}>{label}</A></h2>)}</Card>}>{children}</SidebarLayout>
</>;