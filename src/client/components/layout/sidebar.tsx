import type { FC, PropsWithChildren } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import './sidebar.css';

export const SidebarLayout: FC<PropsWithChildren<{ sidebar: JSX.Element }>> = ({ sidebar, children }) => <div class='sidebar-layout-parent'>
	<div>{sidebar}</div>
	<div>{children}</div>
</div>;