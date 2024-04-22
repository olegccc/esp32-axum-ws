import { render } from 'preact'
import { App } from './app.tsx'
import './index.scss'
import { ConnectionProvider } from './connectionProvider.tsx'

render(
  <ConnectionProvider>
    <App />
  </ConnectionProvider>,
  document.getElementById('app')!
)
