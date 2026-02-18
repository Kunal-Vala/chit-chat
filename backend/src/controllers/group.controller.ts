import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import Group from "../models/Group";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";

// POST /api/groups - Create new group
export const createGroup = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { name, description, memberIds, groupPictureUrl } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        // Validate that all member IDs exist
        if (memberIds && memberIds.length > 0) {
            const users = await User.find({ _id: { $in: memberIds } });
            if (users.length !== memberIds.length) {
                return res.status(400).json({ error: 'One or more member IDs are invalid' });
            }
        }

        // Create a conversation for the group
        const allMembers = [userId, ...(memberIds || [])];
        const uniqueMembers = [...new Set(allMembers)]; // Remove duplicates

        const conversation = await Conversation.create({
            participants: uniqueMembers,
            conversationType: 'group',
            groupName: name,
            groupDescription: description,
            groupAvatarUrl: groupPictureUrl,
            groupMembers: [
                {
                    userId: userId,
                    role: 'admin',
                    joinedAt: new Date()
                },
                ...(memberIds || []).filter((id: string) => id !== userId).map((id: string) => ({
                    userId: id,
                    role: 'member',
                    joinedAt: new Date()
                }))
            ]
        });

        // Create the group
        const group = await Group.create({
            name,
            description,
            adminId: userId,
            memberIds: uniqueMembers,
            groupPictureUrl,
            conversationId: conversation._id
        });

        await group.populate('adminId', 'username profilePictureUrl');
        await group.populate('memberIds', 'username profilePictureUrl onlineStatus');

        return res.status(201).json({ group });
    } catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({ error: 'Failed to create group' });
    }
};

// GET /api/groups/:groupId - Get group details
export const getGroupDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is a member
        const isMember = group.memberIds.some(memberId => memberId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Populate after checking membership
        await group.populate('adminId', 'username profilePictureUrl onlineStatus');
        await group.populate('memberIds', 'username profilePictureUrl onlineStatus');

        return res.json({ group });
    } catch (error) {
        console.error('Error fetching group details:', error);
        return res.status(500).json({ error: 'Failed to fetch group details' });
    }
};

// PUT /api/groups/:groupId - Update group (name, description, picture)
export const updateGroup = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;
        const { name, description, groupPictureUrl } = req.body;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can update group details' });
        }

        // Update group
        if (name !== undefined) group.name = name;
        if (description !== undefined) group.description = description;
        if (groupPictureUrl !== undefined) group.groupPictureUrl = groupPictureUrl;

        await group.save();

        // Update corresponding conversation
        await Conversation.findByIdAndUpdate(group.conversationId, {
            groupName: name,
            groupDescription: description,
            groupAvatarUrl: groupPictureUrl
        });

        await group.populate('adminId', 'username profilePictureUrl');
        await group.populate('memberIds', 'username profilePictureUrl onlineStatus');

        return res.json({ group });
    } catch (error) {
        console.error('Error updating group:', error);
        return res.status(500).json({ error: 'Failed to update group' });
    }
};

// DELETE /api/groups/:groupId - Delete group (admin only)
export const deleteGroup = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can delete the group' });
        }

        // Delete associated conversation and messages
        await Message.deleteMany({ conversationId: group.conversationId });
        await Conversation.findByIdAndDelete(group.conversationId);
        await Group.findByIdAndDelete(groupId);

        return res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        return res.status(500).json({ error: 'Failed to delete group' });
    }
};

// POST /api/groups/:groupId/members - Add members to group
export const addMembers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;
        const { memberIds } = req.body;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ error: 'Member IDs array is required' });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can add members' });
        }

        // Validate that all member IDs exist
        const users = await User.find({ _id: { $in: memberIds } });
        if (users.length !== memberIds.length) {
            return res.status(400).json({ error: 'One or more member IDs are invalid' });
        }

        // Filter out members who are already in the group
        const newMembers = memberIds.filter((id: string) => 
            !group.memberIds.some(memberId => memberId.toString() === id)
        );

        if (newMembers.length === 0) {
            return res.status(400).json({ error: 'All users are already members of the group' });
        }

        // Add new members to group
        group.memberIds.push(...newMembers);
        await group.save();

        // Update conversation participants and groupMembers
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation) {
            conversation.participants.push(...newMembers);
            if (!conversation.groupMembers) {
                conversation.groupMembers = [];
            }
            newMembers.forEach((memberId: string) => {
                conversation.groupMembers!.push({
                    userId: memberId,
                    role: 'member',
                    joinedAt: new Date()
                });
            });
            await conversation.save();
        }

        await group.populate('adminId', 'username profilePictureUrl');
        await group.populate('memberIds', 'username profilePictureUrl onlineStatus');

        return res.json({ group, addedMembers: newMembers });
    } catch (error) {
        console.error('Error adding members:', error);
        return res.status(500).json({ error: 'Failed to add members' });
    }
};

// DELETE /api/groups/:groupId/members/:userId - Remove member (admin only)
export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId, userId: memberToRemove } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can remove members' });
        }

        // Cannot remove admin
        if (memberToRemove === group.adminId.toString()) {
            return res.status(400).json({ error: 'Cannot remove admin. Transfer admin rights first.' });
        }

        // Check if member exists in group
        const memberIndex = group.memberIds.findIndex(id => id.toString() === memberToRemove);
        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Member not found in group' });
        }

        // Remove member from group
        group.memberIds.splice(memberIndex, 1);
        await group.save();

        // Update conversation
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation) {
            conversation.participants = conversation.participants.filter(
                id => id.toString() !== memberToRemove
            );
            if (conversation.groupMembers) {
                conversation.groupMembers = conversation.groupMembers.filter(
                    member => member.userId.toString() !== memberToRemove
                );
            }
            await conversation.save();
        }

        return res.json({ message: 'Member removed successfully', removedMember: memberToRemove });
    } catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({ error: 'Failed to remove member' });
    }
};

// POST /api/groups/:groupId/leave - Leave group
export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Admin cannot leave without transferring admin rights
        if (group.adminId.toString() === userId) {
            return res.status(400).json({ error: 'Admin must transfer admin rights before leaving' });
        }

        // Check if user is a member
        const memberIndex = group.memberIds.findIndex(id => id.toString() === userId);
        if (memberIndex === -1) {
            return res.status(404).json({ error: 'You are not a member of this group' });
        }

        // Remove user from group
        group.memberIds.splice(memberIndex, 1);
        await group.save();

        // Update conversation
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation) {
            conversation.participants = conversation.participants.filter(
                id => id.toString() !== userId
            );
            if (conversation.groupMembers) {
                conversation.groupMembers = conversation.groupMembers.filter(
                    member => member.userId.toString() !== userId
                );
            }
            await conversation.save();
        }

        return res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error('Error leaving group:', error);
        return res.status(500).json({ error: 'Failed to leave group' });
    }
};

// PUT /api/groups/:groupId/admin - Transfer admin rights
export const transferAdmin = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;
        const { newAdminId } = req.body;

        if (!newAdminId) {
            return res.status(400).json({ error: 'New admin ID is required' });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is current admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only current admin can transfer admin rights' });
        }

        // Check if new admin is a member
        const isMember = group.memberIds.some(id => id.toString() === newAdminId);
        if (!isMember) {
            return res.status(400).json({ error: 'New admin must be a member of the group' });
        }

        // Transfer admin rights
        const oldAdminId = group.adminId;
        group.adminId = newAdminId;
        await group.save();

        // Update conversation groupMembers roles
        const conversation = await Conversation.findById(group.conversationId);
        if (conversation && conversation.groupMembers) {
            const oldAdminMember = conversation.groupMembers.find(
                member => member.userId.toString() === oldAdminId.toString()
            );
            const newAdminMember = conversation.groupMembers.find(
                member => member.userId.toString() === newAdminId
            );

            if (oldAdminMember) oldAdminMember.role = 'member';
            if (newAdminMember) newAdminMember.role = 'admin';

            await conversation.save();
        }

        await group.populate('adminId', 'username profilePictureUrl');
        await group.populate('memberIds', 'username profilePictureUrl onlineStatus');

        return res.json({ group, message: 'Admin rights transferred successfully' });
    } catch (error) {
        console.error('Error transferring admin:', error);
        return res.status(500).json({ error: 'Failed to transfer admin rights' });
    }
};

// GET /api/groups/:groupId/messages - Get group messages
export const getGroupMessages = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { groupId } = req.params;
        const { limit = 50, before } = req.query;

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is a member
        const isMember = group.memberIds.some(id => id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Build query
        interface MessageQuery {
            conversationId: typeof group.conversationId;
            isDeleted: { $ne: boolean };
            _id?: { $lt: string };
        }

        const query: MessageQuery = {
            conversationId: group.conversationId,
            isDeleted: { $ne: true }
        };

        if (before && typeof before === 'string') {
            query._id = { $lt: before };
        }

        const messages = await Message.find(query)
            .sort({ sentAt: -1 })
            .limit(Number(limit))
            .populate('senderId', 'username profilePictureUrl');

        return res.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('Error fetching group messages:', error);
        return res.status(500).json({ error: 'Failed to fetch group messages' });
    }
};
