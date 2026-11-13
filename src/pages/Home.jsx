import { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Empty, List, Space, Table, Tag, Typography } from 'antd'
import { CodeOutlined, PlayCircleOutlined, PoweroffOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../api'
import { useAuth } from '../auth'
import { ago } from '../time'

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
      <Card title="Claude tasks">
        <Empty description="Prompting Claude from this page (live output, approvals, diffs) comes in phase B4. For now use Claude inside VS Code." />
      </Card>
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
