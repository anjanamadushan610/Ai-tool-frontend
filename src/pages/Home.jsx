import { useCallback, useEffect, useState } from 'react'
import { Alert, App, AutoComplete, Button, Card, Form, Input, List, Select, Space, Table, Tag, Typography } from 'antd'
import { CodeOutlined, PlayCircleOutlined, PoweroffOutlined, ReloadOutlined, RocketOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { ago, fmt } from '../time'
import { STATUS_COLOR } from './TaskView'

const STATE_COLOR = { running: 'green', stopped: 'default', missing: 'default' }

function MyWorkspace() {
  const { message } = App.useApp()
  const [ws, setWs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setWs(await api('/workspace'))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (what) => {
    setBusy(true)
    setError('')
    try {
      setWs(await api(`/workspace/${what}`, { method: 'POST' }))
      if (what === 'start') message.success('Workspace is running')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const running = ws?.state === 'running'
  return (
    <Card title="My workspace" extra={<Button icon={<ReloadOutlined />} onClick={load} />}>
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Space wrap>
        <Tag color={STATE_COLOR[ws?.state]}>{ws?.state === 'missing' ? 'not created yet' : ws?.state || '…'}</Tag>
        {running ? (
          <>
            <Button type="primary" icon={<CodeOutlined />} href={ws.url} target="_blank">Open VS Code</Button>
            <Button icon={<PoweroffOutlined />} onClick={() => act('stop')} loading={busy}>Stop</Button>
          </>
        ) : (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => act('start')} loading={busy}>
            Start workspace
          </Button>
        )}
      </Space>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
        Stops by itself after 30 minutes without use. Only two staff workspaces run at once, so stop yours when done.
        Push to <b>development</b> only.
      </Typography.Paragraph>
    </Card>
  )
}

function OwnerWorkspaces() {
  const { message } = App.useApp()
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api('/workspaces'))
    } catch (e) {
      message.error(e.message)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const stop = async (username) => {
    const u = (await api('/users')).find((x) => x.username === username)
    await api(`/workspaces/${u.id}/stop`, { method: 'POST' })
    message.success(`Stopped ${username}'s workspace`)
    load()
  }

  return (
    <Card
      title="Workspaces"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<CodeOutlined />} href="/code/" target="_blank">Open my workspace</Button>
        </Space>
      }
    >
      {data && (
        <Typography.Paragraph type="secondary">
          Up to {data.limits.max_running} staff workspaces at once · {data.limits.memory_mb} MB each · idle stop after{' '}
          {data.limits.idle_minutes} min · the server always keeps {data.limits.min_free_mb} MB for prod.
        </Typography.Paragraph>
      )}
      <Table
        rowKey="username"
        size="small"
        pagination={false}
        dataSource={data?.workspaces || []}
        locale={{ emptyText: 'No developers yet' }}
        columns={[
          { title: 'Developer', dataIndex: 'username' },
          { title: 'State', dataIndex: 'state', render: (s) => <Tag color={STATE_COLOR[s]}>{s}</Tag> },
          { title: 'Last active', dataIndex: 'last_active', render: (v) => (v ? ago(v) : '—') },
          {
            title: '', key: 'a',
            render: (_, w) => (w.state === 'running' ? <Button size="small" danger onClick={() => stop(w.username)}>Stop</Button> : null),
          },
        ]}
      />
    </Card>
  )
}

const OWNER_FOLDERS = [
  'SRIBEESonline/fastapi_backend', 'SRIBEESonline/admin', 'SRIBEESonline/mobile', 'SRIBEESonline/partner-portal',
  'SRIBEESonline/ecommerce-frontend', 'SribeesExpress/backend-fastapi', 'SribeesExpress/rider-app', 'Ai-tool',
  '810/Sribees-Online-Finance-Backend', '810/Sribees-Online-Base-Price-Backend', '810/Sribees-Price-Intel-Backend',
  '810/Sribees-Price', '810/Sribees-Online-NewOrder-App',
].map((v) => ({ value: v }))

function NewTask() {
  const { me } = useAuth()
  const { message } = App.useApp()
  const nav = useNavigate()
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const isOwner = me.role === 'owner'

  const submit = async (v) => {
    setBusy(true)
    try {
      const t = await api('/tasks', { method: 'POST', body: v })
      form.resetFields(['prompt'])
      nav(`/tasks/${t.id}`)
    } catch (e) {
      message.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="New Claude task">
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        requiredMark={false}
        initialValues={{ repo: isOwner ? 'SRIBEESonline/fastapi_backend' : me.repos[0] }}
      >
        <Form.Item name="repo" label={isOwner ? 'Folder in your workspace' : 'Repo'} rules={[{ required: true }]}>
          {isOwner ? (
            <AutoComplete options={OWNER_FOLDERS} filterOption={(i, o) => o.value.toLowerCase().includes(i.toLowerCase())} />
          ) : (
            <Select options={me.repos.map((r) => ({ value: r, label: r }))} placeholder="No repos assigned" />
          )}
        </Form.Item>
        <Form.Item name="prompt" label="What should Claude do?" rules={[{ required: true }]}>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder="e.g. Fix the failing test in tests/test_orders.py and explain the cause"
          />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" icon={<RocketOutlined />} loading={busy}>Start</Button>
          <Typography.Text type="secondary">Reading and editing files runs freely; commands and web access ask you first.</Typography.Text>
        </Space>
      </Form>
    </Card>
  )
}

function TaskList() {
  const [rows, setRows] = useState([])
  const load = useCallback(() => api('/tasks').then(setRows).catch(() => {}), [])
  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])
  return (
    <Card title="Tasks" extra={<Button icon={<ReloadOutlined />} onClick={load} />}>
      <Table
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        dataSource={rows}
        scroll={{ x: 560 }}
        locale={{ emptyText: 'No tasks yet' }}
        columns={[
          { title: 'Task', dataIndex: 'title', render: (v, t) => <Link to={`/tasks/${t.id}`}>{v}</Link> },
          { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
          { title: 'Who', dataIndex: 'username', responsive: ['md'] },
          { title: 'Repo', dataIndex: 'repo', responsive: ['lg'] },
          { title: 'Cost', dataIndex: 'cost_usd', render: (c) => `$${c.toFixed(3)}`, responsive: ['md'] },
          { title: 'When', dataIndex: 'created_at', render: fmt, responsive: ['md'] },
        ]}
      />
    </Card>
  )
}

export default function Home() {
  const { me, can } = useAuth()
  const isOwner = me.role === 'owner'
  const repos = isOwner ? ['All repos'] : me.repos
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Hello, {me.display_name || me.username}
      </Typography.Title>
      {isOwner ? <OwnerWorkspaces /> : can('workspace.open') && <MyWorkspace />}
      {can('tasks.start') && <NewTask />}
      <TaskList />
      <Card title="Your repos">
        {repos.length ? (
          <List size="small" dataSource={repos} renderItem={(r) => <List.Item><Tag>{r}</Tag></List.Item>} />
        ) : (
          <Typography.Text type="secondary">No repos assigned yet. Ask the owner.</Typography.Text>
        )}
      </Card>
    </Space>
  )
}
