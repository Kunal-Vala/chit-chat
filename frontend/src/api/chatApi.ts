import { AxiosError } from 'axios'
import apiClient from './axiosConfig'
import type { ChatMessage, Conversation, PaginationInfo } from '../types'

export interface UploadConversationImageResponse {
  mediaUrl: string
  messageType: 'image'
  fileName: string
  fileSize: number
  mimeType: string
}

const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))) {
      return 'Upload timed out. Please try again.'
    }
    const data = error.response?.data
    if (data?.error) return data.error
    if (data?.message) return data.message
    if (data?.details) {
      if (Array.isArray(data.details)) {
        return data.details.map((d: { message?: string } | string) => (typeof d === 'string' ? d : d.message)).filter(Boolean).join(', ')
      }
      return String(data.details)
    }
  }
}

export const getUserConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await apiClient.get<{ conversation: Conversation[] }>('/chat/conversations')
    return response.data.conversation
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to load conversations')
  }
}

export const createConversation = async (participantId: string): Promise<Conversation> => {
  try {
    const response = await apiClient.post<{ conversation: Conversation }>('/chat/conversations', { participantId })
    return response.data.conversation
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to create conversation')
  }
}

export const getConversation = async (conversationId: string): Promise<Conversation> => {
  try {
    const response = await apiClient.get<{ conversation: Conversation }>(`/chat/conversations/${conversationId}`)
    return response.data.conversation
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to load conversation')
  }
}

export const getMessages = async (conversationId: string, page = 1, limit = 50): Promise<{ message: ChatMessage[]; pagination: PaginationInfo }> => {
  try {
    const response = await apiClient.get<{ message: ChatMessage[]; pagination: PaginationInfo }>(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit },
    })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to load messages')
  }
}

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  try {
    await apiClient.put(`/chat/conversations/${conversationId}/read`)
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to mark conversation as read')
  }
}

export const editMessage = async (messageId: string, content: string): Promise<ChatMessage> => {
  try {
    const response = await apiClient.put<{ message: ChatMessage }>(`/chat/messages/${messageId}`, { content })
    return response.data.message
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to edit message')
  }
}

export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await apiClient.delete(`/chat/messages/${messageId}`)
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to delete message')
  }
}

export const uploadConversationImage = async (conversationId: string, file: File): Promise<UploadConversationImageResponse> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<UploadConversationImageResponse>(
      `/chat/messages/${conversationId}/upload-image`,
      formData,
      {
        // Render cold starts + Cloudinary upload can exceed the default 10s.
        timeout: 60_000,
      }
    )
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to upload image')
  }
}

export const searchMessages = async (query: string, conversationId?: string, page = 1, limit = 30): Promise<{ results: ChatMessage[]; pagination: PaginationInfo }> => {
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit),
    })
    if (conversationId) params.append('conversationId', conversationId)
    const response = await apiClient.get<{ results: ChatMessage[]; pagination: PaginationInfo }>(`/chat/search?${params.toString()}`)
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to search messages')
  }
}
