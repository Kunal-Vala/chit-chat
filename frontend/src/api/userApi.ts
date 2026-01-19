import axios, { AxiosError } from "axios";
import { getStoredToken } from "./axiosConfig";

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

