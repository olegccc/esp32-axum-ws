import style from './app.module.scss'
import { useConnection } from './connectionProvider.tsx'

export function App() {
  const { store, status, sendMessage } = useConnection()

  const toggleLedStatus = () => {
    sendMessage({
      type: 'SetLedStatus',
      status: !store.ledOn,
    })
  }

  return (
    <div className={style.root}>
      <div className={style.connectionStatus}>Connection: {status}</div>
      <div className={style.ledStatus}>
        LED status: {store.ledOn ? 'on' : 'off'}
      </div>
      <div className={style.action}>
        <button onClick={() => toggleLedStatus()}>Toggle LED</button>
      </div>
    </div>
  )
}
