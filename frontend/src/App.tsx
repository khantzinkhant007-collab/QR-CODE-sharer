import { lazy, Suspense } from 'react'
import { Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorPage } from './pages/ErrorPage'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const HelpPage = lazy(() => import('./pages/HelpPage').then((module) => ({ default: module.HelpPage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })))
const SharePage = lazy(() => import('./pages/SharePage').then((module) => ({ default: module.SharePage })))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then((module) => ({ default: module.CollectionsPage })))
const EventCollectionPage = lazy(() => import('./pages/EventCollectionPage').then((module) => ({ default: module.EventCollectionPage })))

function Shell() {
  return <Layout><Suspense fallback={<div className="skeleton min-h-[420px]" />}><Outlet /></Suspense></Layout>
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <Layout><ErrorPage /></Layout>,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/events', element: <CollectionsPage /> },
      { path: '/events/:collectionToken', element: <EventCollectionPage /> },
      { path: '/share/:uploadId', element: <SharePage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/help', element: <HelpPage /> },
      { path: '*', element: <ErrorPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
