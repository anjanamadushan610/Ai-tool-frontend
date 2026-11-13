import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Drawer, Grid, Layout, Menu, Space, Tag, Typography } from 'antd'
import {
  AuditOutlined, CodeOutlined, LogoutOutlined, MenuOutlined, SafetyOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons'
import { useAuth } from './auth'

const ROLE_COLOR = { owner: 'gold', developer: 'blue', viewer: 'default' }

export default function Shell() {
  const { me, can, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const screens = Grid.useBreakpoint()
  const [open, setOpen] = useState(false)
  const mobile = !screens.lg

  const items = [
    { key: '/', icon: <CodeOutlined />, label: 'Tasks' },
    can('admin.users') && { key: '/users', icon: <TeamOutlined />, label: 'Users' },
    can('admin.users') && { key: '/sessions', icon: <SafetyOutlined />, label: 'Sessions' },
    (can('audit.view_all') || can('audit.view_own')) && { key: '/audit', icon: <AuditOutlined />, label: 'Audit log' },
    { key: '/account', icon: <UserOutlined />, label: 'My account' },
  ].filter(Boolean)

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[loc.pathname]}
      items={items}
      onClick={({ key }) => {
        nav(key)
        setOpen(false)
      }}
      style={{ borderInlineEnd: 0 }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!mobile && (
        <Layout.Sider width={220} theme="light" style={{ borderInlineEnd: '1px solid rgba(128,128,128,.15)' }}>
          <div style={{ padding: '18px 20px', fontWeight: 700, fontSize: 17 }}>SriBees AI</div>
          {menu}
        </Layout.Sider>
      )}
      <Layout>
        <Layout.Header
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            paddingInline: mobile ? 12 : 24, background: 'transparent',
            borderBottom: '1px solid rgba(128,128,128,.15)',
          }}
        >
          <Space>
            {mobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setOpen(true)} aria-label="Menu" />}
            {mobile && <Typography.Text strong>SriBees AI</Typography.Text>}
          </Space>
          <Space size={mobile ? 4 : 12}>
            {!mobile && <Typography.Text>{me.display_name || me.username}</Typography.Text>}
            <Tag color={ROLE_COLOR[me.role]}>{me.role}</Tag>
            <Button icon={<LogoutOutlined />} onClick={logout}>{mobile ? '' : 'Sign out'}</Button>
          </Space>
        </Layout.Header>
        <Layout.Content style={{ padding: mobile ? 12 : 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Layout.Content>
      </Layout>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" size={260} title="SriBees AI">
        {menu}
      </Drawer>
    </Layout>
  )
}
