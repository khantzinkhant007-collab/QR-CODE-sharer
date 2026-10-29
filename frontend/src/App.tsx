import { Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorPage } from './pages/ErrorPage'

function Shell() {
  return <Layout><Outlet /></Layout>
}

function InitialLoadingShell() {
  return <Layout><div className="skeleton min-h-[420px]" aria-busy="true" /></Layout>
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    HydrateFallback: InitialLoadingShell,
    errorElement: <Layout><ErrorPage /></Layout>,
    children: [
      { path: '/', lazy: () => import('./pages/HomePage').then((module) => ({ Component: module.HomePage })) },
      { path: '/qr', lazy: () => import('./pages/TextQrPage').then((module) => ({ Component: module.TextQrPage })) },
      { path: '/events', lazy: () => import('./pages/CollectionsPage').then((module) => ({ Component: module.CollectionsPage })) },
      { path: '/events/:collectionToken', lazy: () => import('./pages/EventCollectionPage').then((module) => ({ Component: module.EventCollectionPage })) },
      { path: '/share/:uploadId', lazy: () => import('./pages/SharePage').then((module) => ({ Component: module.SharePage })) },
      { path: '/history', lazy: () => import('./pages/HistoryPage').then((module) => ({ Component: module.HistoryPage })) },
      { path: '/privacy', lazy: () => import('./pages/PrivacyPage').then((module) => ({ Component: module.PrivacyPage })) },
      { path: '/help', lazy: () => import('./pages/HelpPage').then((module) => ({ Component: module.HelpPage })) },
      { path: '*', element: <ErrorPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
