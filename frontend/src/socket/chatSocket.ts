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

// Group-related socket functions

export const joinGroup = (groupId: string): void => {
  if (socketInstance) {
    socketInstance.emit('join-group', groupId)
  }
}

export const leaveGroupRoom = (groupId: string): void => {
  if (socketInstance) {
    socketInstance.emit('leave-group', groupId)
  }
}

export const sendGroupMessage = (data: {
  groupId: string
  content: string
  messageType: 'text' | 'image' | 'file'
  mediaUrl?: string
}): void => {
  if (socketInstance) {
    socketInstance.emit('group-message', data)
  }
}

export const notifyMemberAdded = (groupId: string, memberIds: string[]): void => {
  if (socketInstance) {
    socketInstance.emit('member-added', { groupId, memberIds })
  }
}

export const notifyMemberRemoved = (groupId: string, memberId: string): void => {
  if (socketInstance) {
    socketInstance.emit('member-removed', { groupId, memberId })
  }
}

export const notifyGroupUpdated = (groupId: string, updates: { name?: string; description?: string; groupPictureUrl?: string }): void => {
  if (socketInstance) {
    socketInstance.emit('group-updated', { groupId, updates })
  }
}
