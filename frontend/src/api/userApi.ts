import axios, { AxiosError } from "axios";
import { getStoredToken } from "./axiosConfig";
import UserProfile from "../pages/UserProfile";
import { fi } from "zod/locales";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

/**HELPER TO EXTRACT ERROR MESSAGE FROM API RESPONSE */

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (data?.error) return data.error
    if (data?.message) return data.message
    if (data?.details) {
      if (Array.isArray(data.details)) {
        return data.details.map((d: any) => d.message || d).join(', ')
      }
      return String(data.details)
    }
  }
}

interface UserProfile {
  _id: string
  username: string
  email: string
  profilePictureUrl?: string
  statusText?: string
  onlineStatus?: boolean
  lastSeen?: Date
}

interface FriendRequest {
  from: UserProfile | string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt?: Date
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

