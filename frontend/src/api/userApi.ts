import axios, { AxiosError } from "axios";
import { getStoredToken } from "./axiosConfig";
import type { UserProfile, FriendRequest } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

/**HELPER TO EXTRACT ERROR MESSAGE FROM API RESPONSE */

const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (data?.error) return data.error
    if (data?.message) return data.message
    if (data?.details) {
      if (Array.isArray(data.details)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.details.map((d: any) => d.message || d).join(', ')
      }
      return String(data.details)
    }
  }
}


const getHeaders = () => ({
  headers: {
    Authorization: `Bearer ${getStoredToken()}`,
  },
})


// GET PROFILE BY ID

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  try {
    const response = await axios.get<{ user: UserProfile }>(`${API_BASE_URL}/user/profile/${userId}`, getHeaders())
    return response.data.user
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// UPDATE USER PROFILE

export const updateUserProfile = async (userId: string, data: Partial<{ username: string, statusText: string, profilePictureUrl: string }>) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/user/profile/${userId}`, data, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// UPDATE PROFILE PICTURE WITH FILE

export const uploadProfilePicture = async (userId: string, file: File) => {
  try {
    const formData = new FormData()
    formData.append("profilePicture", file)

    const response = await axios.post(`${API_BASE_URL}/user/profile/${userId}/upload-picture`, formData, getHeaders())

    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}


// DELETE PROFILE PICTURE

export const deleteProfilePicture = async (userId: string) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/user/profile/${userId}/picture`, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}



// SEARCH USER BY USERNAME
export const searchUsers = async (query: string, limit = 10, skip = 0) => {
  try {
    const response = await axios.get<{ users: UserProfile[]; total: number; limit: number; skip: number }>(`${API_BASE_URL}/user/search`, {
      params: { q: query, limit, skip },
      ...getHeaders(),
    })
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// SEND FRIEND REQUEST

export const sendFriendRequest = async (targetUserId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/friend/request`, { targetUserId }, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// Accept friend request
export const acceptFriendRequest = async (requesterId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/friend/accept`, { requesterId }, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// Reject friend request
export const rejectFriendRequest = async (requesterId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/friend/reject`, { requesterId }, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}


// Delete friend
export const deleteFriend = async (friendId: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/user/friend/delete`, { friendId }, getHeaders())
    return response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// Get friends list
export const getFriendsList = async () => {
  try {
    const response = await axios.get<{ friends: UserProfile[] }>(`${API_BASE_URL}/user/friend`, getHeaders())
    return response.data.friends
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// Get friend requests
export const getFriendRequests = async () => {
  try {
    const response = await axios.get<{ friendRequests: FriendRequest[] }>(`${API_BASE_URL}/user/friend/request`, getHeaders())
    return response.data.friendRequests
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

// Check friendship status with a specific user
export const checkFriendshipStatus = async (targetUserId: string) => {
  try {
    const response = await axios.get<{ status: 'self' | 'friends' | 'request_sent' | 'request_received' | 'none' }>(
      `${API_BASE_URL}/user/friend/status/${targetUserId}`,
      getHeaders()
    )
    return response.data.status
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}
