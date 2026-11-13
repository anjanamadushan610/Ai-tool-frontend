import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async ({ username, password, remember }) => {
    setBusy(true)
    setError('')
    try {
      await login(username, password, !!remember)
      nav(loc.state?.from || '/', { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>SriBees AI</Typography.Title>
        <Typography.Paragraph type="secondary">Sign in with the username your owner gave you.</Typography.Paragraph>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={submit} initialValues={{ remember: true }} requiredMark={false}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" autoCapitalize="none" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Keep me signed in on this device (30 days)</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={busy}>Sign in</Button>
        </Form>
      </Card>
    </div>
  )
}
