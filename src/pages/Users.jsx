import { useCallback, useEffect, useState } from 'react'
import {
  App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography,
} from 'antd'
import { KeyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../api'
import { fmt } from '../time'

const ROLE_OPTIONS = [
  { value: 'developer', label: 'Developer — tasks + VS Code in assigned repos' },
  { value: 'viewer', label: 'Viewer — read only' },
]
const ROLE_COLOR = { owner: 'gold', developer: 'blue', viewer: 'default' }

function newPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}

export default function Users() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | user
  const [resetFor, setResetFor] = useState(null)
  const [shown, setShown] = useState(null) // { username, password } shown once
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api('/users'))
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const openNew = () => {
    form.setFieldsValue({ username: '', display_name: '', role: 'developer', repos: [], daily_budget_usd: null })
    setEditing('new')
  }
  const openEdit = (u) => {
    form.setFieldsValue({ display_name: u.display_name, role: u.role, repos: u.repos, daily_budget_usd: u.daily_budget_usd })
    setEditing(u)
  }

  const save = async () => {
    const v = await form.validateFields()
    try {
      if (editing === 'new') {
        const password = newPassword()
        await api('/users', { method: 'POST', body: { ...v, password } })
        setShown({ username: v.username.trim().toLowerCase(), password })
      } else {
        const body = { display_name: v.display_name, repos: v.repos, daily_budget_usd: v.daily_budget_usd ?? null }
        if (editing.role !== 'owner') body.role = v.role
        await api(`/users/${editing.id}`, { method: 'PATCH', body })
        message.success('Saved')
      }
      setEditing(null)
      load()
    } catch (e) {
      message.error(e.message)
    }
  }

  const toggle = async (u) => {
    try {
      await api(`/users/${u.id}`, { method: 'PATCH', body: { disabled: !u.disabled } })
      message.success(u.disabled ? 'Enabled' : 'Disabled and signed out')
      load()
    } catch (e) {
      message.error(e.message)
    }
  }

  const reset = async () => {
    const password = newPassword()
    try {
      await api(`/users/${resetFor.id}/password`, { method: 'POST', body: { password } })
      setShown({ username: resetFor.username, password })
      setResetFor(null)
      load()
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    {
      title: 'User', key: 'user',
      render: (_, u) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong delete={u.disabled}>{u.username}</Typography.Text>
          {u.display_name && <Typography.Text type="secondary">{u.display_name}</Typography.Text>}
        </Space>
      ),
    },
    { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={ROLE_COLOR[r]}>{r}</Tag> },
    {
      title: 'Repos', dataIndex: 'repos',
      render: (repos, u) => (u.role === 'owner' ? <Tag>all</Tag> : repos.length ? repos.map((r) => <Tag key={r}>{r.split('/')[1]}</Tag>) : '—'),
    },
    {
      title: 'Daily limit', dataIndex: 'daily_budget_usd',
      render: (v, u) => (u.role === 'owner' ? '—' : v == null ? 'default' : `USD ${v}`),
    },
    { title: 'Signed in', dataIndex: 'active_sessions', render: (n) => (n ? <Tag color="green">{n}</Tag> : '—') },
    { title: 'Status', dataIndex: 'disabled', render: (d) => (d ? <Tag color="red">disabled</Tag> : <Tag color="green">active</Tag>) },
    { title: 'Created', dataIndex: 'created_at', render: fmt, responsive: ['md'] },
    {
      title: '', key: 'actions',
      render: (_, u) => (
        <Space wrap>
          <Button size="small" onClick={() => openEdit(u)}>Edit</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => setResetFor(u)}>Password</Button>
          {u.role !== 'owner' && (
            <Popconfirm
              title={u.disabled ? 'Enable this user?' : 'Disable and sign out now?'}
              onConfirm={() => toggle(u)}
            >
              <Button size="small" danger={!u.disabled}>{u.disabled ? 'Enable' : 'Disable'}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="Users"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Add staff</Button>
        </Space>
      }
    >
      <Table rowKey="id" dataSource={rows} columns={columns} loading={loading} pagination={false} scroll={{ x: 760 }} size="middle" />

      <Modal
        open={!!editing}
        title={editing === 'new' ? 'Add staff member' : `Edit ${editing?.username}`}
        okText={editing === 'new' ? 'Create' : 'Save'}
        onOk={save}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {editing === 'new' && (
            <Form.Item
              name="username" label="Username"
              rules={[{ required: true, pattern: /^[a-zA-Z][a-zA-Z0-9_.-]{2,31}$/, message: '3–32 letters/numbers, starting with a letter' }]}
            >
              <Input autoCapitalize="none" placeholder="e.g. kasun" />
            </Form.Item>
          )}
          <Form.Item name="display_name" label="Name">
            <Input placeholder="Full name" />
          </Form.Item>
          {editing?.role !== 'owner' && (
            <>
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Select options={ROLE_OPTIONS} />
              </Form.Item>
              <Form.Item name="repos" label="Repos (owner/name)" tooltip="Type a repo and press Enter">
                <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="anjanamadushan610/Sribees-Online-Backend" />
              </Form.Item>
              <Form.Item name="daily_budget_usd" label="Daily Claude limit (USD)" tooltip="Empty = the default USD 5">
                <InputNumber min={0} max={1000} step={1} style={{ width: '100%' }} placeholder="5" />
              </Form.Item>
            </>
          )}
          {editing === 'new' && (
            <Typography.Text type="secondary">A strong password is generated and shown once after you create the user.</Typography.Text>
          )}
        </Form>
      </Modal>

      <Modal
        open={!!resetFor}
        title={`New password for ${resetFor?.username}?`}
        okText="Generate new password"
        onOk={reset}
        onCancel={() => setResetFor(null)}
      >
        All of their devices will be signed out.
      </Modal>

      <Modal
        open={!!shown}
        title="Give these to the staff member"
        footer={<Button type="primary" onClick={() => setShown(null)}>Done</Button>}
        onCancel={() => setShown(null)}
        closable={false}
        maskClosable={false}
      >
        <Typography.Paragraph>Username: <Typography.Text code copyable>{shown?.username}</Typography.Text></Typography.Paragraph>
        <Typography.Paragraph>Password: <Typography.Text code copyable>{shown?.password}</Typography.Text></Typography.Paragraph>
        <Typography.Text type="warning">This password is shown only now. They can change it under “My account”.</Typography.Text>
      </Modal>
    </Card>
  )
}
