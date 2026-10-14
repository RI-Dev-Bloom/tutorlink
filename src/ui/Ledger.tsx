/* A semester's pay as it builds up: confirmed so far, waiting to be confirmed, and still
   scheduled. One bar shows the three parts of what it could reach by the semester end.
   Used on admin's Overview (everyone) and the tutor's Pay tab (just them). */

import type { ReactNode } from 'react'
import { rand } from '../lib/types'

type Part = { n: number; amount: number }

export function Ledger({ label, confirmed, waiting, ahead, foot }: {
  label: string; confirmed: Part; waiting: Part; ahead: Part; foot?: ReactNode
}) {
  const total = confirmed.amount + waiting.amount + ahead.amount
  const parts = [
    { key: 'c', name: 'Confirmed', p: confirmed, about: false },
    { key: 'w', name: 'Waiting to be confirmed', p: waiting, about: true },
    { key: 'a', name: 'Still scheduled', p: ahead, about: true },
  ]
  const s = (n: number) => `${n} session${n === 1 ? '' : 's'}`

  return (
    <div className="ledger">
      <p className="eyebrow ledger__label">{label}</p>
      <div className="money">{rand(confirmed.amount)}</div>
      <p className="ledger__sub">confirmed so far · {s(confirmed.n)}</p>

      <div className="stackbar" role="img"
        aria-label={parts.map(x => `${x.name}: ${rand(x.p.amount)}`).join(', ')}>
        {total ? parts.filter(x => x.p.amount > 0).map(x => (
          <span key={x.key} className={`stackbar__${x.key}`} style={{ flexGrow: x.p.amount }} />
        )) : <span className="stackbar__empty" />}
      </div>

      <ul className="ledger__key">
        {parts.map(x => (
          <li key={x.key}>
            <i className={`key key--${x.key}`} aria-hidden />
            <span className="ledger__name">{x.name}<small>{s(x.p.n)}</small></span>
            <b>{x.about && x.p.amount ? 'about ' : ''}{rand(x.p.amount)}</b>
          </li>
        ))}
      </ul>
      <div className="ledger__total"><span>Could reach by the semester end</span><b>{rand(total)}</b></div>
      {foot}
    </div>
  )
}
