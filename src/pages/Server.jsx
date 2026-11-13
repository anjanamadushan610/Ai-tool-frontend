import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Segmented, Space, Statistic, Table, Typography, theme } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, QuestionCircleFilled, ReloadOutlined } from '@ant-design/icons'
import { api } from '../api'
import { AreaChart, BarList } from '../charts'
import { ago } from '../time'

function Health({ rows }) {
  const { token } = theme.useToken()
  const icon = (ok) =>
    ok === true ? <CheckCircleFilled style={{ color: token.colorSuccess }} />
      : ok === false ? <CloseCircleFilled style={{ color: token.colorError }} />
        : <QuestionCircleFilled style={{ color: token.colorTextQuaternary }} />
  return (
    <Table
      rowKey="name" size="small" pagination={false} dataSource={rows} scroll={{ x: 520 }}
      columns={[
        {
          title: 'Service', dataIndex: 'name',
          render: (n, h) => <Space>{icon(h.ok)}<span>{n}</span><Typography.Text type="secondary">{h.ok === true ? 'Up' : h.ok === false ? `Down${h.status ? ` (${h.status})` : ''}` : 'Not checked yet'}</Typography.Text></Space>,
        },
        { title: 'Response', dataIndex: 'ms', render: (v) => (v == null ? '—' : `${v} ms`) },
        { title: 'Up (24 h)', dataIndex: 'uptime_24h', render: (v) => (v == null ? '—' : `${v}%`) },
        { title: 'Checked', dataIndex: 'checked_at', render: (v) => (v ? ago(v) : '—'), responsive: ['md'] },
      ]}
    />
  )
}

export default function Server() {
  const [ov, setOv] = useState(null)
  const [hist, setHist] = useState([])
  const [cont, setCont] = useState([])
  const [hours, setHours] = useState(24)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [o, h] = await Promise.all([api('/admin/overview'), api(`/admin/history?hours=${hours}`)])
      setOv(o)
      setHist(h)
      setError('')
    } catch (e) {
      setError(e.message)
    }
    api('/admin/containers').then(setCont).catch(() => {})
  }, [hours])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const host = ov?.host
  const mem = host?.memory
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Server</Typography.Title>
        <Space>
          <Segmented value={hours} onChange={setHours} options={[{ label: '6 h', value: 6 }, { label: '24 h', value: 24 }, { label: '7 d', value: 168 }]} />
          <Button icon={<ReloadOutlined />} onClick={load} />
        </Space>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}

      {host && (
        <Row gutter={[12, 12]}>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Memory used" value={mem.used_pct} suffix="%" /><Typography.Text type="secondary">{mem.available_mb} MB free of {Math.round(mem.total_mb / 1024)} GB</Typography.Text></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="CPU" value={host.cpu_pct ?? '—'} suffix={host.cpu_pct != null ? '%' : ''} /><Typography.Text type="secondary">{host.load.cpus} cores</Typography.Text></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Load (1 min)" value={host.load.load1} precision={2} /><Typography.Text type="secondary">5 min {host.load.load5} · 15 min {host.load.load15}</Typography.Text></Card></Col>
          <Col xs={12} md={6}><Card size="small"><Statistic title="Disk used" value={host.disk.used_pct} suffix="%" /><Typography.Text type="secondary">{host.disk.free_gb} GB free of {host.disk.total_gb} GB</Typography.Text></Card></Col>
        </Row>
      )}

      <Card title="Prod health" size="small"><Health rows={ov?.health || []} /></Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}><Card title="Memory used (%)" size="small"><AreaChart data={hist} field="mem_used_pct" max={100} unit="%" format={(v) => Math.round(v)} /></Card></Col>
        <Col xs={24} lg={12}><Card title="CPU (%)" size="small"><AreaChart data={hist} field="cpu_pct" max={100} unit="%" format={(v) => Math.round(v)} /></Card></Col>
        <Col xs={24} lg={12}><Card title="Load (1 min)" size="small"><AreaChart data={hist} field="load1" format={(v) => v.toFixed(1)} /></Card></Col>
        <Col xs={24} lg={12}><Card title="Free memory (MB)" size="small"><AreaChart data={hist} field="mem_available_mb" unit=" MB" format={(v) => Math.round(v)} /></Card></Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card title="Containers by memory" size="small" extra={<Typography.Text type="secondary">{cont.length} running</Typography.Text>}>
            {cont.length ? (
              <BarList rows={cont.slice(0, 15)} value={(r) => r.mem_mb} label={(r) => r.name}
                       format={(v) => `${Math.round(v)} MB`} extra={(r) => (r.limit_mb && r.limit_mb < 7000 ? ` / ${r.limit_mb}` : '')} />
            ) : <Typography.Text type="secondary">Loading…</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Claude cost (USD)" size="small">
            <Table
              rowKey="username" size="small" pagination={false} dataSource={ov?.cost || []}
              columns={[
                { title: 'Person', dataIndex: 'username' },
                { title: 'Tasks today', dataIndex: 'tasks_today' },
                { title: 'Today', dataIndex: 'today_usd', render: (v) => v.toFixed(3) },
                { title: 'This month', dataIndex: 'month_usd', render: (v) => v.toFixed(3) },
              ]}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              Cost as reported by Claude Code for tasks started in this app. Staff use their own Claude accounts.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
