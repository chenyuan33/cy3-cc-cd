import { useEffect, useState, type FC, type PropsWithChildren } from "hono/jsx";
import { t, tString } from "../i18n";
import { setTitle } from "../utils/setTitle";
import type { judementType, userInfo } from "../../types";
import { Card } from "../components/card";
import { permissionCount, type allPermissions } from "../../settings";
import type { JSX } from "hono/jsx/jsx-runtime";
import { Time } from "../components/time";
import { User } from "../components/user";

const getJudgementDisplayMode = () => localStorage.judgementDisplay == 'list' ? 'list' : 'grid';
const JudgementList: FC<PropsWithChildren<{ displayMode: 'list' | 'grid' }>> = ({ displayMode, children }) => {
	if (displayMode === 'grid') {
		return <>{children}</>;
	} else {
		return <Card>
			<table>
				<thead>
					<tr>
						<td style={{ whiteSpace: 'nowrap' }}>{t('action')}</td>
						<td style={{ width: '100%' }}>{t('user.user')}</td>
						<td style={{ whiteSpace: 'nowrap' }}>{t('createdAt')}</td>
						<td style={{ whiteSpace: 'nowrap' }}>{t('operator')}</td>
						<td style={{ whiteSpace: 'nowrap' }}>{t('permission.changed')}</td>
						<td style={{ whiteSpace: 'nowrap' }}>{t('comment')}</td>
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</Card>;
	}
};
export const Judgement = () => {
	const [data, setData] = useState<{
		id: number,
		user: userInfo,
		type: judementType,
		payload: any,
		created_at: string,
		batch_id: string,
		operator: userInfo,
		comment: string
	}[] | null>(null);
	useEffect(() => {
		(async () => setData(await (await fetch('/api/judgement')).json()))();
	}, []);
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('judgement.name'));
		return <Card>
			<h1>{t('judgement.name')}</h1>
			<p>{t('judgement.description')}</p>
			<p>{t('loading')}</p>
		</Card>;
	}
	const batchMap = new Map<string, {
		records: {
			user: userInfo,
			type: judementType,
			payload: any
		}[],
		createdAt: string,
		operator: userInfo,
		comment: string
	}>();
	for (const row of data) {
		const key = row.batch_id || `single-${row.type}-${JSON.stringify(row.comment)}-${JSON.stringify(row.payload)}-${row.operator.id}`;
		if (!batchMap.has(key)) {
			batchMap.set(key, {
				records: [],
				createdAt: row.created_at,
				operator: row.operator,
				comment: row.comment
			});
		}
		batchMap.get(key)!.records.push(row);
	}
	setTitle(tString('judgement.name'));
	const [judgementDisplay, setJudgementDisplay] = useState<'list' | 'grid'>(getJudgementDisplayMode());
	const switchJudgementDisplay = (mode: 'list' | 'grid') => {
		localStorage.judgementDisplay = mode;
		setJudgementDisplay(mode);
	};
	return <>
		<Card>
			<h1>{t('judgement.name')}</h1>
			<p>{t('judgement.description')}</p>
		</Card>
		<Card style={{ display: 'flex', flexDirection: 'row-reverse' }}>
			<div style={{ border: 'solid 1px', borderRadius: '10px', padding: '10px', display: 'flex', gap: '10px' }}>
				<button onClick={() => switchJudgementDisplay('list')}><i class='fa-solid fa-list'></i></button>
				<button onClick={() => switchJudgementDisplay('grid')}><i class='fa-solid fa-table-cells-large'></i></button>
			</div>
		</Card>
		<JudgementList displayMode={judgementDisplay}>{batchMap.size ? Array.from(batchMap.values()).map(item => {
			const firstRecord = item.records[0]!;
			let icon: string, color: string, actionText: JSX.Element, changes: { bit: allPermissions; isGrant: boolean }[] | null = null;
			const { payload } = firstRecord;
			switch (firstRecord.type) {
				case 'permission-changed':
					const { oldPermission, newPermission } = payload;
					const changedBits = oldPermission ^ newPermission;
					if (changedBits === 0) return null;
					changes = Array.from({ length: permissionCount }, (_, i) => 1 << i).filter(bit => changedBits & bit).map(bit => ({
						bit: bit as allPermissions,
						isGrant: !!(newPermission & bit)
					}));
					if (changes.every(({ isGrant }) => isGrant)) {
						icon = 'fa-user-plus';
						color = '#52c41a';
						actionText = t('permission.granted');
					} else if (changes.every(({ isGrant }) => !isGrant)) {
						icon = 'fa-user-minus';
						color = '#e74c3c';
						actionText = t('permission.revoked');
					} else {
						icon = 'fa-user';
						color = 'unset';
						actionText = t('permission.changed');
					}
					break;
				case 'name-violation':
					const { oldViolation, newViolation } = payload;
					if (oldViolation === newViolation) return null;
					if (newViolation) {
						icon = 'fa-user-times';
						color = '#e74c3c';
						actionText = t('usernameViolation.setted');
					} else {
						icon = 'fa-user-check';
						color = '#52c41a';
						actionText = t('usernameViolation.unsetted');
					}
					break;
				case 'warn':
					icon = 'fa-triangle-exclamation';
					color = 'orange';
					actionText = t('warn');
					break;
				default:
					return null;
			}
			if (judgementDisplay === 'grid') {
				return <Card style={{ marginBottom: '16px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color }}>
						<i class={`fa-solid ${icon}`}></i>
						<strong>{actionText}</strong>
						<Time time={item.createdAt} style={{ fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }} />
						<strong style={{ fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }}>
							{t('operator')}
							<User user={item.operator} />
						</strong>
					</div>
					<div style={{ marginBottom: '8px' }}>{[...new Set(item.records.map(rec => rec.user))].map(user => <User user={user} />)}</div>
					{firstRecord.type === 'permission-changed' ? <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
						{changes!.map(({ isGrant, bit }) => <li>
							<span style={{ color: isGrant ? '#52c41a' : '#e74c3c' }}>
								{isGrant ? t('permission.grant') : t('permission.revoke')}
							</span>
							&nbsp;
							<code>{t(`permission.${bit}`)}</code>
							&nbsp;
							{t('permission.name')}
						</li>)}
					</ul> : null}
					<div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
						{item.comment || <span style={{ color: 'light-dark(#999, #666)' }}>{t('noReason')}</span>}
					</div>
				</Card>;
			} else {
				return <tr>
					<td>
						<span style={{ display: 'inline-flex', gap: '8px', color, whiteSpace: 'nowrap' }}>
							<i class={`fa-solid ${icon}`}></i>
							<strong>{actionText}</strong>
						</span>
					</td>
					<td>{[...new Set(item.records.map(rec => rec.user))].map(user => <div style={{ whiteSpace: 'nowrap' }}><User user={user} /></div>)}</td>
					<td><Time time={item.createdAt} style={{ whiteSpace: 'nowrap' }} /></td>
					<td><User user={item.operator} style={{ whiteSpace: 'nowrap' }} /></td>
					<td>{firstRecord.type === 'permission-changed' ? <ul style={{ margin: 0, padding: '0 0 0 10px', whiteSpace: 'nowrap' }}>
						{changes!.map(({ isGrant, bit }) => <li>
							<span style={{ color: isGrant ? '#52c41a' : '#e74c3c' }}>
								{isGrant ? t('permission.grant') : t('permission.revoke')}
							</span>
							&nbsp;
							<code>{t(`permission.${bit}`)}</code>
							&nbsp;
							{t('permission.name')}
						</li>)}
					</ul> : <span style={{ display: 'flex', justifyContent: 'center' }}>/</span>}</td>
					<td style={{ whiteSpace: 'nowrap' }}>{item.comment || <span style={{ color: 'light-dark(#999, #666)' }}>{t('noReason')}</span>}</td>
				</tr>;
			}
		}) : <Card><p>{t('judgement.noRecords')}</p></Card>}</JudgementList>
	</>;
};