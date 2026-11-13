import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Popconfirm, Table, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { api } from '../api'
import { ago, fmt } from '../time'

function device(ua) {
  if (!ua) return '—'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : ''
  return `${os}${br ? ' · ' + br : ''}`
}

export default function Sessions() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api('/sessions'))
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const kill = async (s) => {
    try {
      await api(`/sessions/${s.id}`, { method: 'DELETE' })
      message.success(`${s.username} signed out on that device`)
      load()
    } catch (e) {
      message.error(e.message)
    }
  }

  const columns = [
    { title: 'User', dataIndex: 'username', render: (u) => <Typography.Text strong>{u}</Typography.Text> },
    { title: 'Device', dataIndex: 'user_agent', render: device },
    { title: 'IP', dataIndex: 'ip', responsive: ['md'] },
    { title: 'Signed in', dataIndex: 'created_at', render: fmt, responsive: ['md'] },
    { title: 'Last seen', dataIndex: 'last_seen', render: ago },
    {
      title: '', key: 'a',
      render: (_, s) => (
        <Popconfirm title={`Sign ${s.username} out of this device?`} onConfirm={() => kill(s)}>
          <Button size="small" danger>Sign out</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card title="Active sessions" extra={<Button icon={<ReloadOutlined />} onClick={load} />}>
      <Table rowKey="id" dataSource={rows} columns={columns} loading={loading} pagination={false} scroll={{ x: 600 }} />
    </Card>
  )
}
