import { Connection, ConnectionStatus } from './connection.ts'
import { createContext } from 'preact'
import { FC, PropsWithChildren, useCallback } from 'react'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { ConnectionStore } from './connectionStore.ts'
import {
  ClientMessage,
  defaultConnectionStore,
  handleClientMessage,
  handleServerMessage,
  ServerMessage,
} from './messageParser.ts'

type ConnectionState = {
  status: ConnectionStatus
  store: ConnectionStore
  sendMessage: (message: ClientMessage) => void
}

const ConnectionContext = createContext<ConnectionState>({
  status: ConnectionStatus.Disconnected,
  store: defaultConnectionStore(),
  sendMessage: () => {},
})

export const ConnectionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>(
    ConnectionStatus.Disconnected
  )
  const [store, setStore] = useState<ConnectionStore>({ ledOn: false })
  const connectionRef = useRef<Connection>()

  const sendMessage = useCallback((message: ClientMessage) => {
    connectionRef.current?.sendTextMessage(JSON.stringify(message))
    setStore(handleClientMessage(store, message))
  }, [])

  useEffect(() => {
    connectionRef.current = new Connection({
      onConnectionStatus: (status) => {
        setStatus(status)
        if (status === ConnectionStatus.Connected) {
          const newStore = handleServerMessage(store, undefined, sendMessage)
          setStore(newStore)
        }
      },
      onTextMessage: (textMessage) => {
        const message = JSON.parse(textMessage) as ServerMessage
        const newStore = handleServerMessage(store, message, sendMessage)
        setStore(newStore)
      },
    })

    return () => {
      connectionRef.current?.close()
      connectionRef.current = undefined
    }
  }, [])

  return (
    <ConnectionContext.Provider
      value={{
        status,
        store,
        sendMessage,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export const useConnection = () => useContext(ConnectionContext)
