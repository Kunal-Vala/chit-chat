import { useState, useEffect } from 'react'
import { X, Edit2, UserPlus, UserMinus, LogOut, Shield, Users, Trash2, Crown } from 'lucide-react'
import { getGroupByConversationId, updateGroup, deleteGroup, addGroupMembers, removeGroupMember, leaveGroup, transferGroupAdmin } from '../api/groupApi'
import { getFriends } from '../api/userApi'
import type { Group, UserProfile } from '../types'

interface GroupInfoProps {
  conversationId: string
  currentUserId: string
  isOpen: boolean
  onClose: () => void
  onGroupUpdated?: () => void
  onGroupDeleted?: () => void
}

export function GroupInfo({ conversationId, currentUserId, isOpen, onClose, onGroupUpdated, onGroupDeleted }: GroupInfoProps) {
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [groupPictureUrl, setGroupPictureUrl] = useState('')
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showTransferAdmin, setShowTransferAdmin] = useState(false)
  const [selectedNewAdmin, setSelectedNewAdmin] = useState('')

  const isAdmin = group && (typeof group.adminId === 'string' ? group.adminId === currentUserId : group.adminId._id === currentUserId)
  const members = group?.memberIds || []

  useEffect(() => {
    if (isOpen && conversationId) {
      loadGroupDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversationId])

  const loadGroupDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getGroupByConversationId(conversationId)
      setGroup(data)
      setGroupName(data.name)
      setDescription(data.description || '')
      setGroupPictureUrl(data.groupPictureUrl || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group details')
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const friendsList = await getFriends()
      // Filter out already existing members
      const existingMemberIds = members.map(m => typeof m === 'string' ? m : m._id)
      const availableFriends = friendsList.filter((f: UserProfile) => !existingMemberIds.includes(f._id))
      setFriends(availableFriends)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
    }
  }

  const handleUpdateGroup = async () => {
    if (!group) return
    if (!groupName.trim()) {
      setError('Group name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await updateGroup(group._id, {
        name: groupName.trim(),
        description: description.trim() || undefined,
        groupPictureUrl: groupPictureUrl.trim() || undefined,
      })
      await loadGroupDetails()
      setIsEditing(false)
      onGroupUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!group) return
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await deleteGroup(group._id)
      onGroupDeleted?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMembers = async () => {
    if (!group) return
    if (selectedMembers.length === 0) return

    setLoading(true)
    setError(null)

    try {
      await addGroupMembers(group._id, selectedMembers)
      await loadGroupDetails()
      setShowAddMembers(false)
      setSelectedMembers([])
      onGroupUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add members')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!group) return
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await removeGroupMember(group._id, userId)
      await loadGroupDetails()
      onGroupUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!group) return
    if (!confirm('Are you sure you want to leave this group?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await leaveGroup(group._id)
      onGroupDeleted?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group')
    } finally {
      setLoading(false)
    }
  }

  const handleTransferAdmin = async () => {
    if (!group) return
    if (!selectedNewAdmin) return
    if (!confirm('Are you sure you want to transfer admin rights? You will become a regular member.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await transferGroupAdmin(group._id, selectedNewAdmin)
      await loadGroupDetails()
      setShowTransferAdmin(false)
      setSelectedNewAdmin('')
      onGroupUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer admin rights')
    } finally {
      setLoading(false)
    }
  }

  const getMemberUsername = (member: UserProfile | string) => {
    return typeof member === 'string' ? 'Unknown' : member.username
  }

  const getMemberId = (member: UserProfile | string) => {
    return typeof member === 'string' ? member : member._id
  }

  const getMemberAvatar = (member: UserProfile | string) => {
    return typeof member === 'string' ? '/default-avatar.png' : (member.profilePictureUrl || '/default-avatar.png')
  }

  const getMemberStatus = (member: UserProfile | string) => {
    return typeof member === 'string' ? false : member.onlineStatus
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl app-card">
        <div className="flex items-center justify-between app-panel-header p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Group Info</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="app-icon-button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && !group ? (
            <div className="py-8 text-center app-muted">Loading...</div>
          ) : group ? (
            <div className="space-y-6">
              {/* Group Details */}
              <div className="text-center">
                {isEditing ? (
                  <div className="mb-4">
                    <input
                      type="url"
                      value={groupPictureUrl}
                      onChange={(e) => setGroupPictureUrl(e.target.value)}
                      placeholder="Group picture URL"
                      className="app-input"
                    />
                  </div>
                ) : (
                  group.groupPictureUrl ? (
                    <img
                      src={group.groupPictureUrl}
                      alt={group.name}
                      className="app-avatar-img xl mx-auto mb-4"
                    />
                  ) : (
                    <div className="app-avatar-img xl mx-auto mb-4 flex items-center justify-center">
                      <span className="text-4xl font-semibold app-muted">{group.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )
                )}

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group name"
                      className="app-input mb-2"
                    />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Group description"
                      rows={2}
                      className="app-textarea"
                    />
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold">{group.name}</h3>
                    {group.description && (
                      <p className="mt-1 text-sm app-muted">{group.description}</p>
                    )}
                    <p className="mt-2 text-sm app-muted">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="space-y-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setGroupName(group.name)
                          setDescription(group.description || '')
                          setGroupPictureUrl(group.groupPictureUrl || '')
                        }}
                        className="flex-1 app-secondary-button"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateGroup}
                        disabled={loading}
                        className="flex-1 app-primary-button disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex w-full items-center gap-2 app-secondary-button"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit Group
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMembers(true)
                          loadFriends()
                        }}
                        className="flex w-full items-center gap-2 app-secondary-button"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add Members
                      </button>
                      <button
                        onClick={() => setShowTransferAdmin(true)}
                        className="flex w-full items-center gap-2 app-secondary-button"
                      >
                        <Crown className="h-4 w-4" />
                        Transfer Admin Rights
                      </button>
                      <button
                        onClick={handleDeleteGroup}
                        disabled={loading}
                        className="flex w-full items-center gap-2 app-danger-button disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Group
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Leave Group (Non-Admin) */}
              {!isAdmin && (
                <button
                  onClick={handleLeaveGroup}
                  disabled={loading}
                  className="flex w-full items-center gap-2 app-danger-button disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  Leave Group
                </button>
              )}

              {/* Members List */}
              <div>
                <h4 className="mb-3 font-semibold">Members</h4>
                <div className="space-y-2">
                  {members.map((member) => {
                    const memberId = getMemberId(member)
                    const isGroupAdmin = (typeof group.adminId === 'string' ? group.adminId : group.adminId._id) === memberId

                    return (
                      <div key={memberId} className="flex items-center justify-between app-card-inner p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {getMemberAvatar(member) ? (
                              <img
                                src={getMemberAvatar(member)}
                                alt={getMemberUsername(member)}
                                className="app-avatar-img"
                              />
                            ) : (
                              <div className="app-avatar-img flex items-center justify-center">
                                <span className="text-sm font-semibold app-muted">?</span>
                              </div>
                            )}
                            {getMemberStatus(member) && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[color:var(--app-surface)] bg-green-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{getMemberUsername(member)}</p>
                            {isGroupAdmin && (
                              <span className="app-pill text-xs">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                        {isAdmin && !isGroupAdmin && memberId !== currentUserId && (
                          <button
                            onClick={() => handleRemoveMember(memberId)}
                            disabled={loading}
                            className="app-danger-button"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Add Members Modal */}
              {showAddMembers && (
                <div className="app-card-inner p-4">
                  <h4 className="mb-3 font-semibold">Select Friends to Add</h4>
                  {friends.length === 0 ? (
                    <p className="text-sm app-muted">No available friends to add</p>
                  ) : (
                    <>
                      <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                        {friends.map((friend) => (
                          <label key={friend._id} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-[color:var(--app-surface-elev)]">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(friend._id)}
                              onChange={() => {
                                setSelectedMembers((prev) =>
                                  prev.includes(friend._id) ? prev.filter((id) => id !== friend._id) : [...prev, friend._id]
                                )
                              }}
                              className="h-4 w-4"
                            />
                            <img
                              src={friend.profilePictureUrl || '/default-avatar.png'}
                              alt={friend.username}
                              className="app-avatar-img"
                            />
                            <span className="text-sm">{friend.username}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowAddMembers(false)
                            setSelectedMembers([])
                          }}
                          className="flex-1 app-secondary-button"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddMembers}
                          disabled={loading || selectedMembers.length === 0}
                          className="flex-1 app-primary-button disabled:opacity-50"
                        >
                          Add Selected
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Transfer Admin Modal */}
              {showTransferAdmin && (
                <div className="app-card-inner p-4">
                  <h4 className="mb-3 font-semibold">Transfer Admin Rights</h4>
                  <div className="mb-3 space-y-2">
                    {members
                      .filter((m) => {
                        const memberId = getMemberId(m)
                        return memberId !== currentUserId
                      })
                      .map((member) => {
                        const memberId = getMemberId(member)
                        return (
                          <label key={memberId} className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-[color:var(--app-surface-elev)]">
                            <input
                              type="radio"
                              name="newAdmin"
                              value={memberId}
                              checked={selectedNewAdmin === memberId}
                              onChange={(e) => setSelectedNewAdmin(e.target.value)}
                              className="h-4 w-4"
                            />
                            <img
                              src={getMemberAvatar(member)}
                              alt={getMemberUsername(member)}
                              className="app-avatar-img"
                            />
                            <span className="text-sm">{getMemberUsername(member)}</span>
                          </label>
                        )
                      })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowTransferAdmin(false)
                        setSelectedNewAdmin('')
                      }}
                      className="flex-1 app-secondary-button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransferAdmin}
                      disabled={loading || !selectedNewAdmin}
                      className="flex-1 app-primary-button disabled:opacity-50"
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
