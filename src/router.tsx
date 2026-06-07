import { createBrowserRouter } from 'react-router-dom'
import CreateRoomPage from './pages/CreateRoomPage'
import CreateCompletePage from './pages/CreateCompletePage'
import VotePage, { loader as votePageLoader } from './pages/VotePage'
import VoteDonePage, { loader as voteDoneLoader } from './pages/VoteDonePage'
import ResultsPage, { loader as resultsPageLoader } from './pages/ResultsPage'
import AdminPage, { loader as adminPageLoader } from './pages/AdminPage'
import RouteError from './components/RouteError'

export const router = createBrowserRouter([
  { path: '/', element: <CreateRoomPage /> },
  { path: '/complete', element: <CreateCompletePage /> },
  {
    path: '/room/:participantToken',
    element: <VotePage />,
    loader: votePageLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/room/:participantToken/done',
    element: <VoteDonePage />,
    loader: voteDoneLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/room/:participantToken/results',
    element: <ResultsPage />,
    loader: resultsPageLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/admin/:adminToken',
    element: <AdminPage />,
    loader: adminPageLoader,
    errorElement: <RouteError />,
  },
])
