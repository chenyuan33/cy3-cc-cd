import type { FC } from "hono/jsx";
import type { discussionBasicInfo } from "../../routes/api/discussion";
import { Card } from "./card";
import { A } from "./a";
import { t } from "../i18n";
import { User } from "./user";
import { Time } from "./time";

export const DiscussionItem: FC<{ discussion: discussionBasicInfo }> = ({ discussion: { id, user, category, title, created_at, pin } }) => <Card>
	{pin ? <i class='fa-solid fa-thumbtack' style={{ color: 'gold', position: 'absolute', top: '10px', right: '10px' }}></i> : <></>}
	<A href={'/discussion/' + id}>{title}</A><br />
	{t('discussion.itemDescription', {
		user: <User user={user} />,
		category: <A href={`/discussion?category=${category}`}>{t(`discussion.categoryName.${category}`)}</A>,
		createdAt: <Time time={created_at} />
	})}
</Card>;