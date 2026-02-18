import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserProfile, uploadProfilePicture, deleteProfilePicture, updateUserProfile, sendFriendRequest, deleteFriend, checkFriendshipStatus } from '../api/userApi'
import type { UserProfile } from '../types'

function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ username: '', statusText: '' })
  const [isFriend, setIsFriend] = useState(false)
  const [friendRequestSent, setFriendRequestSent] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return
      try {
        setLoading(true)
        const [profileData, friendshipStatus] = await Promise.all([
          getUserProfile(userId),
          checkFriendshipStatus(userId)
        ])
        
        setProfile(profileData)
        setEditData({ username: profileData.username, statusText: profileData.statusText || '' })
        
        // Set friendship state based on status
        setIsFriend(friendshipStatus === 'friends')
        setFriendRequestSent(friendshipStatus === 'request_sent')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 5MB. Please choose a smaller image.')
      event.target.value = '' // Reset the input
      return
    }

    try {
      setLoading(true)
      setError('') // Clear any previous errors
      const response = await uploadProfilePicture(userId, file)
      setProfile(response.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfilePicture = async () => {
    if (!userId || !window.confirm('Are you sure you want to delete your profile picture?')) return

    try {
      setLoading(true)
      setError('')
      const response = await deleteProfilePicture(userId)
      setProfile(response.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!userId) return
    try {
      setLoading(true)
      await updateUserProfile(userId, editData)
      setProfile(prev => prev ? { ...prev, ...editData } : null)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSendFriendRequest = async () => {
    if (!userId) return
    try {
      await sendFriendRequest(userId)
      setFriendRequestSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request')
    }
  }

  const handleDeleteFriend = async () => {
    if (!userId) return
    try {
      await deleteFriend(userId)
      setIsFriend(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove friend')
    }
  }

  if (loading) return <div className="text-center py-8 app-muted">Loading...</div>
  if (!profile) return <div className="text-center py-8 app-muted">User not found</div>

  const isOwnProfile = currentUser?.userId === userId
  const canEdit = isOwnProfile

  return (
    <div className="app-page">
      <div className="app-card p-6 md:p-8">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex flex-col items-center md:items-start">
            <div className="relative">
              {profile.profilePictureUrl ? (
                <img src={profile.profilePictureUrl} alt={profile.username} className="app-avatar-img xl" />
              ) : (
                <div className="app-avatar-img xl flex items-center justify-center">
                  <span className="text-4xl text-[color:var(--app-muted)]">{profile.username[0]?.toUpperCase()}</span>
                </div>
              )}
              {canEdit && (
                <>
                  <label className="absolute -bottom-2 -right-2 app-icon-button app-icon-accent cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </label>
                  {profile.profilePictureUrl && (
                    <button
                      onClick={handleDeleteProfilePicture}
                      className="absolute -bottom-2 -left-2 app-icon-button"
                      title="Delete profile picture"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 text-sm app-muted">
              {profile.onlineStatus ? <span>Online</span> : <span>Offline</span>}
            </div>
          </div>

          <div className="flex-1">
            {isEditing && canEdit ? (
              <div className="space-y-4">
                <div>
                  <label className="app-label">Username</label>
                  <input
                    type="text"
                    value={editData.username}
                    onChange={e => setEditData({ ...editData, username: e.target.value })}
                    className="app-input"
                    placeholder="Username"
                  />
                </div>
                <div>
                  <label className="app-label">Status</label>
                  <textarea
                    value={editData.statusText}
                    onChange={e => setEditData({ ...editData, statusText: e.target.value })}
                    className="app-textarea"
                    placeholder="Status"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleUpdateProfile} className="app-primary-button">
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="app-secondary-button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2 font-display">{profile.username}</h1>
                <p className="app-muted mb-1">{profile.email}</p>
                {profile.statusText && <p className="app-muted italic mb-4">{profile.statusText}</p>}
                {canEdit && (
                  <button onClick={() => setIsEditing(true)} className="app-secondary-button">
                    Edit Profile
                  </button>
                )}
              </>
            )}

            {!isOwnProfile && (
              <div className="mt-6 flex gap-3">
                {isFriend ? (
                  <button onClick={handleDeleteFriend} className="app-secondary-button">
                    Remove Friend
                  </button>
                ) : friendRequestSent ? (
                  <button disabled className="app-secondary-button opacity-60">
                    Friend Request Sent
                  </button>
                ) : (
                  <button onClick={handleSendFriendRequest} className="app-primary-button">
                    Add Friend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button onClick={() => navigate(-1)} className="app-link">
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
