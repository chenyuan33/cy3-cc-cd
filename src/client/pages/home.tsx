import { useEffect, useState, type FC, type PropsWithChildren } from "hono/jsx";
import { Card } from "../components/card";
import { Form } from "../components/form";
import { Time } from "../components/time";
import { t, tString } from "../i18n";
import type { discussionBasicInfo } from "../../routes/api/discussion";
import { setTitle } from "../utils/setTitle";
import { useCurrentUser } from "../utils/currentUser";
import { A } from "../components/a";
import { DiscussionItem } from "../components/discussionItem";
import './home.css';

const Good: FC<PropsWithChildren<{}>> = ({ children }) => <div style={{ color: 'red' }}>{children}</div>;
const Bad: FC<PropsWithChildren<{}>> = ({ children }) => <div style={{ color: 'light-dark(black, white)' }}>{children}</div>;
const GoodContent: FC<{ title_en: string, good_en: string, title_zh: string, good_zh: string }> = ({ title_en, good_en, title_zh, good_zh }) => <div style={{ padding: '10px' }}><strong>{t('home.checkIn.good')}{title_en ?? title_zh}</strong><br />{good_en ?? good_zh}</div>;
const BadContent: FC<{ title_en: string, bad_en: string, title_zh: string, bad_zh: string }> = ({ title_en, bad_en, title_zh, bad_zh }) => <div style={{ padding: '10px' }}><strong>{t('home.checkIn.bad')}{title_en ?? title_zh}</strong><br />{bad_en ?? bad_zh}</div>;
export default () => {
	const nextDay = new Date();
	nextDay.setDate(nextDay.getDate() + 1);
	nextDay.setHours(0, 0, 0, 0);
	const currentUser = useCurrentUser();
	const [data, setData] = useState<{
		discussions: discussionBasicInfo[],
		announcements: discussionBasicInfo[],
		notCheckedIn: boolean,
		checkin_count: number,
		checkin_today_status: -3 | -2 | -1 | 0 | 1 | 2 | 3,
		checkin_today_good1: { title_en: string, good_en: string, title_zh: string, good_zh: string } | null,
		checkin_today_good2: { title_en: string, good_en: string, title_zh: string, good_zh: string } | null,
		checkin_today_bad1: { title_en: string, bad_en: string, title_zh: string, bad_zh: string } | null,
		checkin_today_bad2: { title_en: string, bad_en: string, title_zh: string, bad_zh: string } | null
	} | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	useEffect(() => {(async () => {
		setData(await (await fetch('/api/home')).json());
	})()}, [refreshKey]);
	setTitle(tString('home.name'));
	if (!data) {
		return <Card><h1>{t('home.name')}</h1><p>{t('loading')}</p></Card>
	}
	const { discussions, announcements } = data;
	return <>
		<Card>
			<h1>{t('home.name')}</h1>
		</Card>
		<div class='grid'>
			<Card style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center' }}>
				<h2>{t('home.checkIn.name')}</h2>
				{currentUser
					? (() => {
						const { notCheckedIn } = data;
						if (notCheckedIn) {
							return <Form action='/api/check-in' method='post' onSuccess={() => setRefreshKey(key => key + 1)}>
								<button type='submit'>{t('home.checkIn.button')}</button>
							</Form>;
						}
						const { checkin_count, checkin_today_status, checkin_today_good1, checkin_today_good2, checkin_today_bad1, checkin_today_bad2 } = data;
						return <>
							<p>{t('home.checkIn.resetTime', { date: <Time time={nextDay} /> })}</p>
							<p>{t('home.checkIn.count', { count: checkin_count.toString() })}</p>
							<h2 style={{
								color: {
									'-3': 'light-dark(black, white)',
									'-2': 'light-dark(black, white)',
									'-1': 'light-dark(black, white)',
									0: 'green',
									1: 'red',
									2: 'red',
									3: 'red'
								}[checkin_today_status as number]
							}}>{t(`home.checkIn.status.${checkin_today_status}`)}</h2>
							<p style={{ 'font-size': 'smaller', color: 'gray' }}>{t('home.checkIn.referenceOnly')}</p>
							<div style={{ display: 'grid', width: '100%', 'grid-template-columns': 'repeat(2, 1fr)' }}>
								<div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
									{checkin_today_good1 && checkin_today_good2
										? <Good><GoodContent {...checkin_today_good1} /><GoodContent {...checkin_today_good2} /></Good>
										: <Bad><strong>{t('home.checkIn.everythingBad')}</strong></Bad>
									}</div>
								<div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
									{checkin_today_bad1 && checkin_today_bad2
										? <Bad><BadContent {...checkin_today_bad1} /><BadContent {...checkin_today_bad2} /></Bad>
										: <Good><strong>{t('home.checkIn.everythingGood')}</strong></Good>
									}</div>
							</div>
						</>;
					})()
					: <p>{t('home.checkIn.afterLogin', { login: <A href='/user/login'>{t('user.login')}</A> })}</p>}
			</Card>
			<Card>
				<h2>{t('home.recentAnnouncements')}</h2>
				{announcements.length ? announcements.map(item => <DiscussionItem discussion={item} />) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>}
			</Card>
			<Card>
				<h2>{t('home.recentDiscussions')}</h2>
				{discussions.length ? discussions.map(item => <DiscussionItem discussion={item} />) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>}
			</Card>
		</div>
	</>;
};