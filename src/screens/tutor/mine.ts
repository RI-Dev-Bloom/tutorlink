/* The signed-in tutor's own data: same loader admin uses for a tutor's page,
   so both sides always agree on the numbers. */

import { useAuth } from '../../lib/auth'
import { invalidate, useQuery } from '../../lib/data'
import { loadSettings } from '../../lib/student'
import { counts, currentSemester, loadSemesters, loadTutor } from '../../lib/tutors'

export function useMine() {
  const { profile } = useAuth()
  const uid = profile!.id
  const semesters = useQuery('semesters', loadSemesters)
  const sem = semesters.data ? currentSemester(semesters.data) : null
  const semId = sem?.id ?? null
  const data = useQuery(`tutor:${uid}:${semId}`, () => loadTutor(uid, semId))
  const settings = useQuery('settings', loadSettings)

  const d = data.data
  const used = d ? d.sessions.filter(s => counts(s, semId)).length : 0
  const limit = d?.override ?? sem?.session_quota ?? 0
  return {
    uid, sem, d, error: data.error, loading: data.loading,
    rate: Number(settings.data?.rate_per_session ?? 0),
    used, limit, left: Math.max(0, limit - used),
  }
}

export const refreshMine = () => invalidate('tutor', 'tutors', 'sessions')
