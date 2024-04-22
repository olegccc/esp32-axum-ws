import { ConnectionStore } from './connectionStore.ts'

type ServerMessageLedStatus = {
  type: 'LedStatus'
  status: boolean
}

type ServerMessagePing = {
  type: 'Ping'
}

export type ServerMessage = ServerMessagePing | ServerMessageLedStatus

type ClientMessagePong = {
  type: 'Pong'
}

type ClientMessageSetLedStatus = {
  type: 'SetLedStatus'
  status: boolean
}

type ClientMessageQueryLedStatus = {
  type: 'QueryLedStatus'
}

export type ClientMessage =
  | ClientMessagePong
  | ClientMessageSetLedStatus
  | ClientMessageQueryLedStatus

export const defaultConnectionStore = (): ConnectionStore => ({ ledOn: false })

export type SendMessage = (message: ClientMessage) => void

export const handleClientMessage = (
  store: ConnectionStore,
  message: ClientMessage
): ConnectionStore => {
  switch (message.type) {
    case 'SetLedStatus':
      return {
        ...store,
        ledOn: message.status,
      }
  }
  return store
}

export const handleServerMessage = (
  store: ConnectionStore,
  message: ServerMessage | undefined,
  sendMessage: SendMessage
): ConnectionStore => {
  if (!message) {
    // on connected
    sendMessage({
      type: 'QueryLedStatus',
    })
    return store
  }

  switch (message?.type) {
    case 'LedStatus':
      return {
        ...store,
        ledOn: message.status,
      }
    case 'Ping':
      sendMessage({
        type: 'Pong',
      })
      break
  }
  return store
}
