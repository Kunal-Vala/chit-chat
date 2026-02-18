import { useState, useEffect } from 'react'
import { X, Users, Upload } from 'lucide-react'
import { createGroup } from '../api/groupApi'
import { getFriends } from '../api/userApi'
import type { UserProfile } from '../types'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: () => void
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupPictureUrl, setGroupPictureUrl] = useState('')
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingFriends, setLoadingFriends] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
    }
  }, [isOpen])

  const loadFriends = async () => {
    setLoadingFriends(true)
    try {
      const friendsList = await getFriends()
      setFriends(friendsList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('Group name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        memberIds: selectedMembers,
        groupPictureUrl: groupPictureUrl.trim() || undefined,
      })

      // Reset form
      setGroupName('')
      setDescription('')
      setSelectedMembers([])
      setGroupPictureUrl('')
      onGroupCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setGroupName('')
      setDescription('')
      setSelectedMembers([])
      setGroupPictureUrl('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Create New Group</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Group Picture */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Group Picture URL (optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Upload className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={groupPictureUrl}
                  onChange={(e) => setGroupPictureUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {groupPictureUrl && (
                <img
                  src={groupPictureUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded-lg object-cover"
                  onError={() => setGroupPictureUrl('')}
                />
              )}
            </div>
          </div>

          {/* Group Name */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{groupName.length}/100</p>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{description.length}/500</p>
          </div>

          {/* Select Members */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Add Members (optional)
            </label>
            {loadingFriends ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading friends...</div>
            ) : friends.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                No friends available to add
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {friends.map((friend) => (
                  <label
                    key={friend._id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(friend._id)}
                      onChange={() => handleMemberToggle(friend._id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <img
                      src={friend.profilePictureUrl || '/default-avatar.png'}
                      alt={friend.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium">{friend.username}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedMembers.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
