import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, App, Button, Card, Checkbox, Collapse, Empty, Input, Space, Spin, Tabs, Tag, Typography,
} from 'antd'
import { CheckOutlined, CloseOutlined, PaperClipOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { api } from '../api'
import { useAuth } from '../auth'
import { fmt } from '../time'
import { IMAGE_ACCEPT, uploadImages } from '../uploads'

export const STATUS_COLOR = { queued: 'blue', running: 'processing', done: 'green', failed: 'red', stopped: 'orange', interrupted: 'magenta' }
const ACTIVE = ['queued', 'running']

function short(v, n = 400) {
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function toolSummary(name, input = {}) {
  if (name === 'Bash') return input.command
  if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(name)) return input.file_path || input.notebook_path
  if (name === 'Grep' || name === 'Glob') return input.pattern
  if (name === 'WebFetch') return input.url
  return short(input, 160)
}

function resultText(c) {
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.map((x) => (x.type === 'text' ? x.text : `[${x.type}]`)).join('\n')
  return JSON.stringify(c)
}

function Event({ e }) {
  const d = e.data
  if (e.kind === 'prompt') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '90%' }}>
        <Card size="small" style={{ background: 'rgba(217,154,0,.12)' }}>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{d.text}</Typography.Paragraph>
        </Card>
      </div>
    )
  }
  if (e.kind === 'status') {
    return <Typography.Text type="secondary" style={{ fontSize: 12 }}>— {d.status}{d.by ? ` by ${d.by}` : ''} · {fmt(e.at)}</Typography.Text>
  }
  if (e.kind === 'error') return <Alert type="error" showIcon message={d.message} />
  if (e.kind === 'git') {
    return (
      <Typography.Text style={{ fontSize: 12 }}>
        <Tag color={d.ok ? 'green' : 'red'}>{d.ok ? (d.pushed ? 'pushed' : 'committed') : 'git failed'}</Tag>
        {d.branch} · {d.files} file(s) · “{d.message}” · {d.by}
      </Typography.Text>
    )
  }
  if (e.kind === 'approval') {
    const color = { pending: 'gold', allowed: 'green', denied: 'red' }[d.status]
    return <Typography.Text style={{ fontSize: 12 }}><Tag color={color}>{d.status}</Tag>{d.tool}{d.by ? ` · ${d.by}` : ''}</Typography.Text>
  }
  // kind === 'claude': raw stream-json from Claude Code
  if (d.type === 'assistant') {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {(d.message?.content || []).map((c, i) => {
          if (c.type === 'text') return <Typography.Paragraph key={i} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{c.text}</Typography.Paragraph>
          if (c.type === 'tool_use') {
            return (
              <Typography.Text key={i} code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {c.name}: {toolSummary(c.name, c.input)}
              </Typography.Text>
            )
          }
          return null
        })}
      </Space>
    )
  }
  if (d.type === 'user') {
    const results = (d.message?.content || []).filter((c) => c.type === 'tool_result')
    if (!results.length) return null
    return (
      <Collapse
        size="small"
        items={results.map((r, i) => ({
          key: i,
          label: <Typography.Text type={r.is_error ? 'danger' : 'secondary'}>{r.is_error ? 'tool error' : 'tool output'}</Typography.Text>,
          children: <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>{short(resultText(r.content), 6000)}</pre>,
        }))}
      />
    )
  }
  if (d.type === 'result') {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {d.is_error ? 'Finished with an error' : 'Finished'} · {d.num_turns ?? '?'} turns · {Math.round((d.duration_ms || 0) / 1000)} s · USD {(d.total_cost_usd || 0).toFixed(4)}
      </Typography.Text>
    )
  }
  if (d.type === 'text') return <Typography.Text type="secondary">{d.text}</Typography.Text>
  return null
}

function CommitPanel({ id, canPush }) {
  const { message } = App.useApp()
  const [git, setGit] = useState(null)
  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(() => {
    api(`/tasks/${id}/git`).then((g) => {
      setGit(g)
      setPicked(g.files.map((f) => f.path))
    }).catch((e) => message.error(e.message))
  }, [id, message])

  useEffect(() => {
    load()
  }, [load])

  const run = async (push) => {
    setBusy(true)
    setResult(null)
    try {
      const r = await api(`/tasks/${id}/commit`, { method: 'POST', body: { message: msg, files: picked, push } })
      setResult(r)
      if (r.ok) {
        message.success(push ? `Pushed to ${r.branch}` : 'Committed')
        setMsg('')
      }
      load()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!git) return <Spin />
  const protectedBranch = ['main', 'master'].includes(git.branch)
  return (
    <Card size="small" title={<Space>Commit <Tag>{git.branch}</Tag>{git.ahead ? <Tag color="blue">{git.ahead} not pushed</Tag> : null}</Space>}>
      {protectedBranch && <Alert type="warning" showIcon message={`${git.branch} is never committed to from the app. Switch to development in VS Code.`} style={{ marginBottom: 8 }} />}
      {git.files.length === 0 ? (
        <Typography.Text type="secondary">Nothing to commit.</Typography.Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Checkbox.Group value={picked} onChange={setPicked} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            options={git.files.map((f) => ({ value: f.path, label: <span><Tag style={{ fontFamily: 'monospace' }}>{f.status}</Tag>{f.path}</span> }))} />
          {canPush && !protectedBranch && (
            <>
              <Input.TextArea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Commit message" autoSize={{ minRows: 1, maxRows: 4 }} />
              <Space wrap>
                <Button onClick={() => run(false)} loading={busy} disabled={!msg.trim() || !picked.length}>Commit</Button>
                <Button type="primary" onClick={() => run(true)} loading={busy} disabled={!msg.trim() || !picked.length}>Commit + push to {git.branch}</Button>
              </Space>
            </>
          )}
        </Space>
      )}
      {result && !result.ok && (
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>{result.steps.map((s) => `$ git ${s.step}\n${s.output}`).join('\n')}</pre>
      )}
    </Card>
  )
}

function Diff({ id, canPush, active }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    api(`/tasks/${id}/diff`).then(setData).catch((e) => setErr(e.message))
  }, [id])
  if (err) return <Alert type="error" message={err} />
  if (!data) return <Spin />
  if (!data.diff && !data.status) return <Empty description="No changes in this folder." />
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {!active && <CommitPanel id={id} canPush={canPush} />}
      <pre style={{ margin: 0 }}>{data.status}</pre>
      {data.truncated && <Alert type="warning" message="The diff is long; only the first part is shown." />}
      <pre style={{ fontSize: 12, overflow: 'auto', maxHeight: '60vh' }}>
        {data.diff.split('\n').map((l, i) => (
          <div key={i} style={{ color: l.startsWith('+') && !l.startsWith('+++') ? '#3f9142' : l.startsWith('-') && !l.startsWith('---') ? '#cf1322' : undefined }}>{l || ' '}</div>
        ))}
      </pre>
    </Space>
  )
}

export default function TaskView() {
  const { id } = useParams()
  const { me, can } = useAuth()
  const { message } = App.useApp()
  const [task, setTask] = useState(null)
  const [events, setEvents] = useState([])
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const fileInput = useRef(null)
  const [busy, setBusy] = useState(false)
  const lastId = useRef(0)
  const bottom = useRef(null)

  const poll = useCallback(async () => {
    const [t, ev] = await Promise.all([api(`/tasks/${id}`), api(`/tasks/${id}/events?after=${lastId.current}`)])
    setTask(t)
    if (ev.length) {
      lastId.current = ev[ev.length - 1].id
      setEvents((old) => [...old, ...ev])
    }
    return t
  }, [id])

  useEffect(() => {
    lastId.current = 0
    setEvents([])
    let stop = false
    let timer
    const tick = async () => {
      try {
        const t = await poll()
        if (!stop) timer = setTimeout(tick, ACTIVE.includes(t.status) ? 1200 : 5000)
      } catch (e) {
        if (!stop) timer = setTimeout(tick, 5000)
      }
    }
    tick()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [poll])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events.length, task?.pending_approvals?.length])

  const decide = async (a, allow) => {
    try {
      await api(`/tasks/${id}/approvals/${a.id}`, { method: 'POST', body: { allow } })
      poll()
    } catch (e) {
      message.error(e.message)
    }
  }

  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      const attachments = await uploadImages(files)
      await api(`/tasks/${id}/messages`, { method: 'POST', body: { prompt: text, attachments } })
      setText('')
      setFiles([])
      poll()
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    try {
      await api(`/tasks/${id}/stop`, { method: 'POST' })
      poll()
    } catch (e) {
      message.error(e.message)
    }
  }

  if (!task) return <Spin />
  const active = ACTIVE.includes(task.status)
  const mine = task.username === me.username || me.role === 'owner'

  return (
    <Card
      title={
        <Space wrap>
          <Typography.Text strong>{task.title}</Typography.Text>
          <Tag color={STATUS_COLOR[task.status]}>{task.status}</Tag>
        </Space>
      }
      extra={
        <Space>
          <Typography.Text type="secondary">USD {task.cost_usd.toFixed(4)}</Typography.Text>
          {active && mine && <Button danger icon={<StopOutlined />} onClick={stop}>Stop</Button>}
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">{task.repo} · {task.username} · {fmt(task.created_at)}</Typography.Paragraph>
      <Tabs
        items={[
          {
            key: 'chat',
            label: 'Conversation',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {events.map((e) => <Event key={e.id} e={e} />)}
                </div>
                {active && !task.pending_approvals?.length && <Spin size="small" tip="Claude is working…"><div style={{ height: 24 }} /></Spin>}
                {task.pending_approvals?.map((a) => (
                  <Alert
                    key={a.id}
                    type="warning"
                    showIcon
                    message={`Claude wants to use ${a.tool}`}
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, fontSize: 12 }}>{toolSummary(a.tool, a.input)}</pre>
                        {mine && (
                          <Space>
                            <Button type="primary" icon={<CheckOutlined />} onClick={() => decide(a, true)}>Allow</Button>
                            <Button danger icon={<CloseOutlined />} onClick={() => decide(a, false)}>Deny</Button>
                          </Space>
                        )}
                      </Space>
                    }
                  />
                ))}
                {mine && files.length > 0 && (
                  <Space wrap>
                    {files.map((f, i) => (
                      <Tag key={i} closable onClose={() => setFiles(files.filter((_, j) => j !== i))}>{f.name}</Tag>
                    ))}
                  </Space>
                )}
                {mine && (
                  <Space.Compact style={{ width: '100%' }}>
                    <Button icon={<PaperClipOutlined />} disabled={active} onClick={() => fileInput.current?.click()} aria-label="Attach image" />
                    <input ref={fileInput} type="file" accept={IMAGE_ACCEPT} multiple hidden
                      onChange={(e) => {
                        setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 5))
                        e.target.value = ''
                      }} />
                    <Input.TextArea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={active ? 'Claude is still working…' : 'Ask a follow-up (same conversation)'}
                      autoSize={{ minRows: 1, maxRows: 6 }}
                      disabled={active}
                      onPressEnter={(e) => {
                        if (!e.shiftKey) {
                          e.preventDefault()
                          send()
                        }
                      }}
                    />
                    <Button type="primary" icon={<SendOutlined />} onClick={send} loading={busy} disabled={active} />
                  </Space.Compact>
                )}
                <div ref={bottom} />
              </Space>
            ),
          },
          { key: 'diff', label: 'Changes', children: <Diff id={id} active={active} canPush={mine && can('git.push_staff')} /> },
        ]}
      />
    </Card>
  )
}
