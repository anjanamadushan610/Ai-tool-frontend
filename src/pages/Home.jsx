import { Card, Empty, List, Space, Tag, Typography } from 'antd'
import { useAuth } from '../auth'

export default function Home() {
  const { me, can } = useAuth()
  const repos = me.role === 'owner' ? ['All repos'] : me.repos
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Hello, {me.display_name || me.username}
      </Typography.Title>
      <Card title="Claude tasks">
        <Empty
          description={
            can('tasks.start')
              ? 'Starting a task, live output, approvals and diffs arrive in the next phase (B4).'
              : 'Tasks shared with you will show here.'
          }
        />
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
