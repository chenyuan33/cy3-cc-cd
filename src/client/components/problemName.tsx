import type { FC } from "hono/jsx";
import type { ProblemBasicInfo } from "../../routes/api/problem";
import { A } from "./a";

export const ProblemName: FC<{ problem: ProblemBasicInfo, unlinkable?: boolean }> = ({ problem: { id, title }, unlinkable = false }) => unlinkable
	? <>
		<strong>#{id}</strong>
		&nbsp;
		{title}
	</>
	: <A href={'/problem/' + id}>
		<strong>#{id}</strong>
		&nbsp;
		{title}
	</A>;