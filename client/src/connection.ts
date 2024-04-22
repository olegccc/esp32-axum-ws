export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connected = 'connected',
  Connecting = 'connecting',
}

export interface ConnectionCallbacks {
  onConnectionStatus?: (newStatus: ConnectionStatus) => void
  onTextMessage?: (message: string) => void
  onBinaryMessage?: (message: ArrayBuffer) => void
}

export class Connection {
  private socket?: WebSocket
  private socketConnected = false
  private socketSuspended = false
  private socketConnecting = false
  private lastSocketMessage?: number
  private socketReceiveHandle?: number
  private unsuccessfulConnectAttempts = 0
  private lastConnectAttempt = 0

  public constructor(private readonly callbacks: ConnectionCallbacks) {
    setInterval(this.backgroundTick, 200)
  }

  private connectionStatus = ConnectionStatus.Disconnected

  private updateConnectionStatus() {
    let currentStatus: ConnectionStatus
    if (this.socketConnecting) {
      currentStatus = ConnectionStatus.Connecting
    } else if (!this.socketConnected) {
      currentStatus = ConnectionStatus.Disconnected
    } else {
      currentStatus = ConnectionStatus.Connected
    }
    if (currentStatus !== this.connectionStatus) {
      this.connectionStatus = currentStatus
      this.callbacks.onConnectionStatus?.(currentStatus)
    }
  }

  private getDelay() {
    let delay: number
    if (this.unsuccessfulConnectAttempts < 3) {
      delay = 500
    } else if (this.unsuccessfulConnectAttempts < 6) {
      delay = 4000
    } else if (this.unsuccessfulConnectAttempts < 10) {
      delay = 10000
    } else {
      delay = 30000
    }
    return delay
  }

  private backgroundTick = () => {
    if (this.socketConnected || this.socketSuspended || this.socketConnecting) {
      return
    }

    const currentTime = new Date().valueOf()
    const delay = this.getDelay()
    if (currentTime - this.lastConnectAttempt < delay) {
      return
    }
    this.connect().catch(console.error)
  }

  public suspend() {
    this.socketSuspended = true
  }

  public resume() {
    this.socketSuspended = false
  }

  private async connect() {
    const currentTime = new Date().valueOf()
    this.socketConnecting = true
    this.lastConnectAttempt = currentTime
    this.updateConnectionStatus()
    try {
      this.clearSocket()
      const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://'
      const url = `${protocol}${location.hostname}:${location.port}/ws`
      this.socket = new WebSocket(url)
      this.socket.binaryType = 'arraybuffer'
      this.socket.onerror = this.onSocketError
      this.socket.onmessage = this.onSocketMessage
      this.socket.onopen = this.onSocketOpen
      this.socket.onclose = this.onSocketClose
    } catch (error) {
      this.socketConnecting = false
      this.unsuccessfulConnectAttempts++
    }
  }

  private clearSocket() {
    if (!this.socket) {
      return
    }
    this.socket.onerror = null
    this.socket.onclose = null
    this.socket.onmessage = null
    this.socket.onopen = null
    this.socket = undefined
  }

  public close() {
    this.socketSuspended = true
    this.closeSocket()
  }

  private closeSocket(dontCallClose = false) {
    this.socketConnected = false
    this.socketConnecting = false
    this.lastConnectAttempt = new Date().valueOf()
    this.updateConnectionStatus()
    if (!this.socket) {
      return
    }
    if (!dontCallClose) {
      this.socket.close()
    }
    this.clearSocket()
    this.callbacks.onConnectionStatus?.(ConnectionStatus.Disconnected)
  }

  private onSocketError = (ev: Event) => {
    if (import.meta.env.DEV) {
      console.error('WebSocket error', ev)
    }
    this.closeSocket()
    this.unsuccessfulConnectAttempts++
    this.lastConnectAttempt = new Date().valueOf()
  }

  private onSocketOpen = (ev: Event) => {
    if (import.meta.env.DEV) {
      console.log('WebSocket open', ev)
    }
    this.unsuccessfulConnectAttempts = 0
    this.socketConnected = true
    this.socketConnecting = false
    this.lastSocketMessage = this.lastConnectAttempt = new Date().getTime()
    this.resetSocketReceiveTimer()
    this.updateConnectionStatus()
  }

  private onSocketClose = (ev: CloseEvent) => {
    if (import.meta.env.DEV) {
      console.log('WebSocket close', ev)
    }
    this.closeSocket(true)
  }

  private onSocketMessage = (ev: MessageEvent) => {
    if (!ev || !ev.data) {
      return
    }

    this.lastSocketMessage = new Date().getTime()

    if (typeof ev.data === 'string') {
      if (ev.data === 'pong') {
        return
      }
      this.callbacks.onTextMessage?.(ev.data)
    } else {
      this.callbacks.onBinaryMessage?.(ev.data)
    }
  }

  public sendTextMessage(message: string) {
    if (!this.socket || !this.socketConnected) {
      if (import.meta.env.DEV) {
        console.log(`message: ${message}`)
        return
      } else {
        throw new Error('Cannot send, no connection')
      }
    }
    this.socket.send(message)
  }

  sendBinaryMessage(data: ArrayBuffer) {
    this.socket?.send(data)
  }

  private deleteSocketReceiveTimer() {
    if (this.socketReceiveHandle) {
      clearTimeout(this.socketReceiveHandle)
      this.socketReceiveHandle = undefined
    }
  }

  private resetSocketReceiveTimer() {
    this.deleteSocketReceiveTimer()
    this.socketReceiveHandle = setTimeout(
      () => this.onSocketReceiveTimer(),
      import.meta.env.DEV ? 20000 : 5000
    )
  }

  private onSocketReceiveTimer() {
    this.socketReceiveHandle = undefined
    if (!this.socketConnected) {
      return
    }
    if (
      !this.lastSocketMessage ||
      new Date().getTime() - this.lastSocketMessage >
        (import.meta.env.DEV ? 40000 : 15000)
    ) {
      this.closeSocket()
      return
    }
    this.sendTextMessage('ping')
    this.resetSocketReceiveTimer()
  }

  public isConnected() {
    return this.connectionStatus === ConnectionStatus.Connected
  }
}
