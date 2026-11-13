import { App, Button, Card, Descriptions, Form, Input, Tag } from 'antd'
import { api } from '../api'
import { useAuth } from '../auth'

export default function Account() {
  const { me } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const submit = async ({ current, next }) => {
    try {
      await api('/auth/password', { method: 'POST', body: { current, new: next } })
      message.success('Password changed. Other devices were signed out.')
      form.resetFields()
    } catch (e) {
      message.error(e.message)
    }
  }

  return (
    <Card title="My account" style={{ maxWidth: 560 }}>
      <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Username">{me.username}</Descriptions.Item>
        <Descriptions.Item label="Role"><Tag>{me.role}</Tag></Descriptions.Item>
      </Descriptions>
      <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item name="current" label="Current password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item name="next" label="New password" rules={[{ required: true, min: 12, message: 'At least 12 characters' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit">Change password</Button>
      </Form>
    </Card>
  )
}
