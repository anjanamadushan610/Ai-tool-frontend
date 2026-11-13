import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Table, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { api } from '../api'
import { fmt } from '../time'

const COLOR = { 'login.failed': 'red', 'login.locked': 'volcano', 'login.ok': 'green', 'session.killed': 'orange' }

export default function Audit() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [more, setMore] = useState(true)

  const load = useCallback(async (before) => {
    setLoading(true)
    try {
      const page = await api(`/audit?limit=100${before ? `&before_id=${before}` : ''}`)
      setRows((old) => (before ? [...old, ...page] : page))
      setMore(page.length === 100)
    } catch (e) {
      message.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    load()
  }, [load])

  const columns = [
    { title: 'When', dataIndex: 'at', render: fmt, width: 150 },
    { title: 'Who', dataIndex: 'username' },
    { title: 'Action', dataIndex: 'action', render: (a) => <Tag color={COLOR[a]}>{a}</Tag> },
    { title: 'Target', dataIndex: 'target' },
    { title: 'Detail', dataIndex: 'detail', responsive: ['md'] },
    { title: 'IP', dataIndex: 'ip', responsive: ['lg'] },
  ]

  return (
    <Card title="Audit log" extra={<Button icon={<ReloadOutlined />} onClick={() => load()} />}>
      <Table rowKey="id" dataSource={rows} columns={columns} loading={loading} pagination={false} scroll={{ x: 640 }} size="small" />
      {more && rows.length > 0 && (
        <Button block style={{ marginTop: 12 }} onClick={() => load(rows[rows.length - 1].id)} loading={loading}>
          Load older
        </Button>
      )}
    </Card>
  )
}
