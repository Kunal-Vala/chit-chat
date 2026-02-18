import { AxiosError } from 'axios'
import apiClient from './axiosConfig'
import type { Group, ChatMessage } from '../types'

const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof AxiosError) {
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

export interface CreateGroupData {
  name: string
  description?: string
  memberIds?: string[]
  groupPictureUrl?: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
  groupPictureUrl?: string
}

export const createGroup = async (data: CreateGroupData): Promise<Group> => {
  try {
    const response = await apiClient.post<{ group: Group }>('/groups', data)
    return response.data.group
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to create group')
  }
}

export const getGroupDetails = async (groupId: string): Promise<Group> => {
  try {
    const response = await apiClient.get<{ group: Group }>(`/groups/${groupId}`)
    return response.data.group
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to fetch group details')
  }
}

export const getGroupByConversationId = async (conversationId: string): Promise<Group> => {
  try {
    const response = await apiClient.get<{ group: Group }>(`/groups/conversation/${conversationId}`)
    return response.data.group
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to fetch group details')
  }
}

export const updateGroup = async (groupId: string, data: UpdateGroupData): Promise<Group> => {
  try {
    const response = await apiClient.put<{ group: Group }>(`/groups/${groupId}`, data)
    return response.data.group
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to update group')
  }
}

export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    await apiClient.delete(`/groups/${groupId}`)
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to delete group')
  }
}

export const addGroupMembers = async (groupId: string, memberIds: string[]): Promise<{ group: Group; addedMembers: string[] }> => {
  try {
    const response = await apiClient.post<{ group: Group; addedMembers: string[] }>(`/groups/${groupId}/members`, { memberIds })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to add members')
  }
}

export const removeGroupMember = async (groupId: string, userId: string): Promise<void> => {
  try {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`)
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to remove member')
  }
}

export const leaveGroup = async (groupId: string): Promise<void> => {
  try {
    await apiClient.post(`/groups/${groupId}/leave`)
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to leave group')
  }
}

export const transferGroupAdmin = async (groupId: string, newAdminId: string): Promise<Group> => {
  try {
    const response = await apiClient.put<{ group: Group }>(`/groups/${groupId}/admin`, { newAdminId })
    return response.data.group
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to transfer admin rights')
  }
}

export const getGroupMessages = async (groupId: string, limit = 50, before?: string): Promise<{ messages: ChatMessage[] }> => {
  try {
    const params: { limit: number; before?: string } = { limit }
    if (before) params.before = before
    const response = await apiClient.get<{ messages: ChatMessage[] }>(`/groups/${groupId}/messages`, { params })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error) ?? 'Failed to fetch group messages')
  }
}
