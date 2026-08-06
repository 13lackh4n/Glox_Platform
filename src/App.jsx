import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

import StudentDashboard from './pages/student/Dashboard'
import Courses from './pages/student/Courses'
import CourseDetail from './pages/student/CourseDetail'
import Test from './pages/student/Test'
import Result from './pages/student/Result'
import Profile from './pages/student/Profile'

import InstructorDashboard from './pages/instructor/Dashboard'
import InstructorCourses from './pages/instructor/Courses'
import InstructorCourseManage from './pages/instructor/CourseManage'
import InstructorTests from './pages/instructor/Tests'
import InstructorTestCreate from './pages/instructor/TestCreate'
import InstructorTestEdit from './pages/instructor/TestEdit'
import InstructorStudents from './pages/instructor/Students'
import InstructorResults from './pages/instructor/Results'

import AdminDashboard from './pages/admin/Dashboard'
import AdminCourses from './pages/admin/Courses'
import AdminUsers from './pages/admin/Users'
import AdminInstructors from './pages/admin/Instructors'
import AdminStats from './pages/admin/Stats'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Ümumi */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Tələbə */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:courseId" element={<CourseDetail />} />
            <Route
              path="/test/:testId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Test />
                </ProtectedRoute>
              }
            />
            <Route
              path="/result/:resultId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Result />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Təlimçi */}
            <Route
              path="/instructor"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/courses"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/courses/:courseId"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorCourseManage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/tests"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorTests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/tests/create"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorTestCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/tests/:testId/edit"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorTestEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/students"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorStudents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/results"
              element={
                <ProtectedRoute allowedRoles={['instructor']}>
                  <InstructorResults />
                </ProtectedRoute>
              }
            />

            {/* Super Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/instructors"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminInstructors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stats"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminStats />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
