import { RouterProvider } from 'react-router/dom'
import { createBrowserRouter } from 'react-router'
import { routes } from './routes'

const router = createBrowserRouter(routes)

function App() {
  return <RouterProvider router={router} />
}

export default App
