/* Admin → Response templates: ready-made replies for approving or declining
   an application. Admin can still tweak the text before sending. */

import { useState, type FormEvent } from 'react'
import { invalidate, must, useQuery } from '../../lib/data'
import { friendlyError, supabase } from '../../lib/supabase'
import { Icon } from '../../ui/icons'
import { useOverlay } from '../../ui/Overlay'
import { BackButton, Empty, Loading, NavBar } from '../../ui/parts'
import { haptic } from '../../ui/haptic'

export type Template = { id: string; label: string; body: string; kind: 'approve' | 'decline'; sort_order: number }

export const loadTemplates = async () =>
  (await must(supabase.from('response_templates').select('id, label, body, kind, sort_order')
    .order('sort_order').order('label').returns<Template[]>())) ?? []

const KINDS = [['approve', 'For approving'], ['decline', 'For declining']] as const

export function Templates() {
  const { openSheet } = useOverlay()
  const list = useQuery('templates', loadTemplates)

  return (
    <>
      <NavBar title="Response templates" left={<BackButton />} />
      <div className="body"><div className="pad pad--fab">
        <p className="small muted">Pick one when you approve or decline an application. You can still edit the text before sending.</p>
        {list.loading ? <Loading /> : null}
        {list.error ? <p className="err">{list.error}</p> : null}
        {list.data && !list.data.length ? <Empty icon="doc" title="No templates" line="Add replies you send often." /> : null}
        {KINDS.map(([kind, title]) => {
          const rows = (list.data ?? []).filter(t => t.kind === kind)
          return rows.length ? (
            <div key={kind}>
              <div className="sect">{title}</div>
              <div className="card">
                {rows.map(t => (
                  <button className="row" key={t.id} onClick={() => openSheet(<TemplateSheet template={t} />)}>
                    <span className="rmain">
                      <span className="rname">{t.label}</span>
                      <span className="rmeta" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.body}</span>
                    </span>
                    <span className="rside"><Icon name="chev" size={17} stroke={2.1} /></span>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        })}
      </div></div>
      <button className="fab fab--low" onClick={() => openSheet(<TemplateSheet />)}>
        <Icon name="plus" size={18} stroke={2.2} /> Add template
      </button>
    </>
  )
}

function TemplateSheet({ template: t }: { template?: Template }) {
  const { closeSheet, toast } = useOverlay()
  const [kind, setKind] = useState<Template['kind']>(t?.kind ?? 'decline')
  const [label, setLabel] = useState(t?.label ?? '')
  const [body, setBody] = useState(t?.body ?? '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (work: () => PromiseLike<{ error: unknown }>, done: string) => {
    setBusy(true); setError('')
    const { error: err } = await work()
    setBusy(false)
    if (err) { haptic(24); setError(friendlyError(err)); return }
    haptic(14); invalidate('templates'); closeSheet(); toast(done)
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    const row = { kind, label: label.trim(), body: body.trim() }
    run(() => t ? supabase.from('response_templates').update(row).eq('id', t.id)
                : supabase.from('response_templates').insert({ ...row, sort_order: 50 }),
        t ? 'Template saved' : 'Template added')
  }
  const changed = !t || kind !== t.kind || label.trim() !== t.label || body.trim() !== t.body

  return (
    <form onSubmit={save}>
      <p className="sheet-sub">Response template</p>
      <h3 className="sheet-title">{t ? 'Edit template' : 'New template'}</h3>
      <div className="sheet-form">
        <div className="seg" style={{ marginTop: 6 }}>
          {KINDS.map(([k, title]) => (
            <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => { haptic(6); setKind(k) }}>{title}</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="f-tl">Short name</label>
          <input id="f-tl" type="text" placeholder="e.g. Role already filled" maxLength={60} value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-tb">Message to the student</label>
          <textarea id="f-tb" rows={5} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {error ? <p className="err">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy || !changed || label.trim().length < 2 || body.trim().length < 10}>
          {busy ? 'Saving…' : t ? 'Save' : 'Add template'}
        </button>
        {t ? (
          <button type="button" className={'btn ' + (confirmRemove ? 'btn--danger' : 'btn--ghost')} disabled={busy}
            onClick={() => confirmRemove
              ? run(() => supabase.from('response_templates').delete().eq('id', t.id), 'Template removed')
              : (haptic(16), setConfirmRemove(true))}>
            {confirmRemove ? 'Yes, remove it' : 'Remove template'}
          </button>
        ) : null}
      </div>
    </form>
  )
}
