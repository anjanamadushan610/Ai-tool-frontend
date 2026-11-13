import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

// The server stores UTC; people read Sri Lanka time.
const TZ = 'Asia/Colombo'

export function fmt(iso) {
  if (!iso) return ''
  const d = dayjs.utc(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`)
  return d.tz(TZ).format('YYYY-MM-DD HH:mm')
}

export function ago(iso) {
  if (!iso) return ''
  return dayjs.utc(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).fromNow()
}
