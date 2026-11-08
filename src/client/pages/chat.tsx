import { useEffect, useRef, useState } from "hono/jsx";
import { permissionChat } from "../../settings";
import { useCurrentUser } from "../utils/currentUser";
import { AccessDenied, LoginRequired } from "./error";
import { subscribeUrlChange } from "../utils/urlSearch";
import type { userInfo } from "../../types";
import { t, tString } from "../i18n";
import { Card } from "../components/card";
import { setTitle } from "../utils/setTitle";
import './chat.css';
import { UserSearch } from "../components/userSearch";
import { navigate } from "@w3cj/ruta";
import { User } from "../components/user";
import { Time } from "../components/time";
import { MdRender } from "../components/md/renderer";
import { Form, FormMdEditor } from "../components/form";
import { toast } from "../components/toast";

export const Chat = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const uid = searchParams.get('uid');
	const currentUser = useCurrentUser();
	const [data, setData] = useState<{
		user: userInfo | null,
		recent: { sender: userInfo, receiver: userInfo, content: string, created_at: string, unread_count: number }[],
		messages: { sender: userInfo, content: string, read: number, created_at: string }[]
	} | null>(null);
	const reload = async () => setData(await (await fetch('/api/chat' + (uid ? '?uid=' + uid : ''))).json());
	useEffect(() => {
		reload();
	}, [uid]);
	const messageContainerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (messageContainerRef.current) {
			messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
		}
	}, [data?.user?.id, data?.messages.length]);
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionChat)) {
		return <AccessDenied />;
	}
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('chat.name'));
		return <Card>
			<h1>{t('chat.name')}</h1>
			<p>{t('loading')}</p>
		</Card>;
	}
	setTitle(tString('chat.name'));
	return <Card class={data.user ? 'hasMain' : ''} style={{ display: 'flex', position: 'fixed', top: '50px', bottom: '10px', left: '70px', right: '10px' }}>
		<div id='chatSide'>
			<h1>{t('chat.name')}</h1>
			<UserSearch id='userSearch' onChange={() => {
				const urlSearchParams = new URLSearchParams(location.search);
				urlSearchParams.set('uid', (document.getElementById('userSearch')! as HTMLInputElement).value);
				navigate(location.pathname + '?' + urlSearchParams.toString());
			}} doNotDisplayCurrentChoice />
			<h2>{t('chat.recent')}</h2>
			<div style={{ overflow: 'auto', position: 'relative' }}>
				{data.recent.map(({
					sender,
					receiver,
					content,
					created_at,
					unread_count
				}) => {
					const targetUser = sender.id === currentUser.id ? receiver : sender;
					return (
						<div
							style={{
								borderTop: '1px solid light-dark(#e0e0e0, #444)',
								cursor: 'pointer',
								backgroundColor: 'transparent',
							}}
							onClick={() => {
								const urlSearchParams = new URLSearchParams(location.search);
								urlSearchParams.set('uid', targetUser.id.toString());
								navigate(location.pathname + '?' + urlSearchParams.toString());
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontWeight: '500', fontSize: '15px' }}>
									{unread_count ? <><span style={{ color: 'white', backgroundColor: 'red', borderRadius: '5px', padding: '1px 5px', fontSize: '70%' }}>{unread_count}</span>&nbsp;</> : <></>}
									<User user={targetUser} />
								</span>
								<span style={{ fontSize: '11px', color: 'lightgray' }}>
									<Time time={created_at} short />
								</span>
							</div>
							<div style={{
								fontSize: '13px',
								color: 'light-dark(#555, #bbb)',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								marginTop: '2px'
							}}>
								<MdRender markdown={content} />
							</div>
						</div>
					);
				})}
			</div>
		</div>
		<div id='chatMain'>
			{data.user ? <>
				<div style={{ position: 'relative', borderBottom: 'solid 1px lightgray', display: 'flex', justifyContent: 'center', padding: '8px 0', backgroundColor: 'light-dark(#f9f9f9, #2a2a2a)' }}>
					<User user={data.user} />
					<span id='chatMainCloser' onClick={() => navigate('/chat')}>
						<i class='fa-solid fa-angle-left mobileOnly'></i>
						<i class='fa-solid fa-xmark desktopOnly'></i>
					</span>
				</div>
				<div ref={messageContainerRef} style={{ flex: 1, overflow: 'auto', padding: '12px 16px', backgroundColor: 'light-dark(#eaeaea, #1a1a1a)' }}>
					{[...data.messages].reverse().map(({ sender, content, read, created_at }) => {
						const isSelf = sender.id === currentUser.id;
						return <div key={created_at} style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
							<div style={{ marginBottom: '1px', alignSelf: isSelf ? 'flex-end' : 'flex-start', fontSize: '13px' }}>
								<User user={sender} />
							</div>
							<div style={{ display: 'flex', alignItems: 'end', flexDirection: isSelf ? 'row-reverse' : 'row', gap: '5px' }}>
								<div style={{
									maxWidth: '70%',
									backgroundColor: isSelf ? '#95ec69' : 'light-dark(#ffffff, #2d2d2d)',
									color: isSelf ? '#000' : 'light-dark(#000, #e0e0e0)',
									borderRadius: '8px',
									padding: '0px 12px',
									wordBreak: 'break-word',
									boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
									border: isSelf ? 'none' : '1px solid light-dark(#e0e0e0, #444)',
								}}><MdRender markdown={content} /></div>
								<div style={{
									fontSize: '10px',
									color: isSelf ? '#555' : '#999',
									textAlign: isSelf ? 'right' : 'left',
									marginTop: '2px',
									display: 'flex',
									justifyContent: isSelf ? 'flex-end' : 'flex-start',
									gap: '4px'
								}}>
									<Time time={created_at} />
									<span style={read ? {} : { color: 'red' }}>{t(read ? 'readStatus.read' : 'readStatus.unread')}</span>
								</div>
							</div>
						</div>;
					})
					}
				</div>
				<Form action='/api/chat/send' method='post' style={{ padding: '8px 16px', backgroundColor: 'light-dark(#f9f9f9, #2a2a2a)', borderTop: '1px solid light-dark(#e0e0e0, #444)' }} onSuccess={() => {
					toast(t('sendedSuccessful'), 'success');
					reload();
				}}>
					<input type='hidden' name='uid' value={data.user.id} />
					<FormMdEditor id='content' name='content' height='80px' required />
					<button type='submit'>{t('send')}</button>
				</Form>
			</> : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#999', padding: '20px' }}>
				<i class="fa-solid fa-comment-dots" style={{ fontSize: '40px', marginBottom: '16px' }}></i>
				<p style={{ fontSize: '18px' }}>{t('selectConversation')}</p>
			</div>}
		</div>
	</Card>;
};