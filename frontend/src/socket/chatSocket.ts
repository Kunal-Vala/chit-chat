import { io, Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

const resolveSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (explicit) return explicit

  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (apiBase) {
    if (apiBase.endsWith('/api')) return apiBase.slice(0, -4)
    return apiBase
  }

  return 'http://localhost:5000'
}

export const connectChatSocket = (token: string): Socket => {
  if (socketInstance) {
    if (!socketInstance.connected) {
      socketInstance.auth = { token }
      socketInstance.connect()
    }
    return socketInstance
  }

  socketInstance = io(resolveSocketUrl(), {
    autoConnect: true,
    auth: { token },
  })

  return socketInstance
}

export const getChatSocket = (): Socket | null => socketInstance

export const disconnectChatSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
