import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Result, Spin } from 'antd'
import { useAuth } from './auth'
import Shell from './Shell'
import Login from './pages/Login'
import Home from './pages/Home'
import Users from './pages/Users'
import Sessions from './pages/Sessions'
import Audit from './pages/Audit'
import Account from './pages/Account'
import TaskView from './pages/TaskView'
import Server from './pages/Server'

function Guard({ perm, anyOf, children }) {
  const { me, can } = useAuth()
  const loc = useLocation()
  if (me === undefined) return <Spin fullscreen />
  if (me === null) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  const allowed = perm ? can(perm) : anyOf ? anyOf.some(can) : true
  if (!allowed) return <Result status="403" title="No access" subTitle="Your role does not include this page." />
  return children
}

export default function App() {
  const { me } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={me ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Guard><Shell /></Guard>}>
        <Route index element={<Home />} />
        <Route path="users" element={<Guard perm="admin.users"><Users /></Guard>} />
        <Route path="sessions" element={<Guard perm="admin.users"><Sessions /></Guard>} />
        <Route path="audit" element={<Guard anyOf={['audit.view_all', 'audit.view_own']}><Audit /></Guard>} />
        <Route path="account" element={<Account />} />
        <Route path="tasks/:id" element={<TaskView />} />
        <Route path="server" element={<Guard perm="admin.metrics"><Server /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
