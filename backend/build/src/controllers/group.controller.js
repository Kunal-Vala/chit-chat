"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupMessages = exports.transferAdmin = exports.leaveGroup = exports.removeMember = exports.addMembers = exports.deleteGroup = exports.updateGroup = exports.getGroupByConversationId = exports.getGroupDetails = exports.createGroup = void 0;
const Group_1 = __importDefault(require("../models/Group"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
// POST /api/groups - Create new group
const createGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { name, description, memberIds, groupPictureUrl } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        // Validate that all member IDs exist
        if (memberIds && memberIds.length > 0) {
            const users = yield User_1.default.find({ _id: { $in: memberIds } });
            if (users.length !== memberIds.length) {
                return res.status(400).json({ error: 'One or more member IDs are invalid' });
            }
        }
        // Create a conversation for the group
        const allMembers = [userId, ...(memberIds || [])];
        const uniqueMembers = [...new Set(allMembers)]; // Remove duplicates
        const conversation = yield Conversation_1.default.create({
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
                ...(memberIds || []).filter((id) => id !== userId).map((id) => ({
                    userId: id,
                    role: 'member',
                    joinedAt: new Date()
                }))
            ]
        });
        // Create the group
        const group = yield Group_1.default.create({
            name,
            description,
            adminId: userId,
            memberIds: uniqueMembers,
            groupPictureUrl,
            conversationId: conversation._id
        });
        yield group.populate('adminId', 'username profilePictureUrl');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.status(201).json({ group });
    }
    catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({ error: 'Failed to create group' });
    }
});
exports.createGroup = createGroup;
// GET /api/groups/:groupId - Get group details
const getGroupDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const group = yield Group_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is a member
        const isMember = group.memberIds.some(memberId => memberId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        // Populate after checking membership
        yield group.populate('adminId', 'username profilePictureUrl onlineStatus');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.json({ group });
    }
    catch (error) {
        console.error('Error fetching group details:', error);
        return res.status(500).json({ error: 'Failed to fetch group details' });
    }
});
exports.getGroupDetails = getGroupDetails;
// GET /api/groups/conversation/:conversationId - Get group by conversation ID
const getGroupByConversationId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { conversationId } = req.params;
        const group = yield Group_1.default.findOne({ conversationId });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is a member
        const isMember = group.memberIds.some(memberId => memberId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        // Populate after checking membership
        yield group.populate('adminId', 'username profilePictureUrl onlineStatus');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.json({ group });
    }
    catch (error) {
        console.error('Error fetching group by conversation ID:', error);
        return res.status(500).json({ error: 'Failed to fetch group details' });
    }
});
exports.getGroupByConversationId = getGroupByConversationId;
// PUT /api/groups/:groupId - Update group (name, description, picture)
const updateGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const { name, description, groupPictureUrl } = req.body;
        const group = yield Group_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can update group details' });
        }
        // Update group
        if (name !== undefined)
            group.name = name;
        if (description !== undefined)
            group.description = description;
        if (groupPictureUrl !== undefined)
            group.groupPictureUrl = groupPictureUrl;
        yield group.save();
        // Update corresponding conversation
        yield Conversation_1.default.findByIdAndUpdate(group.conversationId, {
            groupName: name,
            groupDescription: description,
            groupAvatarUrl: groupPictureUrl
        });
        yield group.populate('adminId', 'username profilePictureUrl');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.json({ group });
    }
    catch (error) {
        console.error('Error updating group:', error);
        return res.status(500).json({ error: 'Failed to update group' });
    }
});
exports.updateGroup = updateGroup;
// DELETE /api/groups/:groupId - Delete group (admin only)
const deleteGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const group = yield Group_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can delete the group' });
        }
        // Delete associated conversation and messages
        yield Message_1.default.deleteMany({ conversationId: group.conversationId });
        yield Conversation_1.default.findByIdAndDelete(group.conversationId);
        yield Group_1.default.findByIdAndDelete(groupId);
        return res.json({ message: 'Group deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting group:', error);
        return res.status(500).json({ error: 'Failed to delete group' });
    }
});
exports.deleteGroup = deleteGroup;
// POST /api/groups/:groupId/members - Add members to group
const addMembers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const { memberIds } = req.body;
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ error: 'Member IDs array is required' });
        }
        const group = yield Group_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is admin
        if (group.adminId.toString() !== userId) {
            return res.status(403).json({ error: 'Only admin can add members' });
        }
        // Validate that all member IDs exist
        const users = yield User_1.default.find({ _id: { $in: memberIds } });
        if (users.length !== memberIds.length) {
            return res.status(400).json({ error: 'One or more member IDs are invalid' });
        }
        // Filter out members who are already in the group
        const newMembers = memberIds.filter((id) => !group.memberIds.some(memberId => memberId.toString() === id));
        if (newMembers.length === 0) {
            return res.status(400).json({ error: 'All users are already members of the group' });
        }
        // Add new members to group
        group.memberIds.push(...newMembers);
        yield group.save();
        // Update conversation participants and groupMembers
        const conversation = yield Conversation_1.default.findById(group.conversationId);
        if (conversation) {
            conversation.participants.push(...newMembers);
            if (!conversation.groupMembers) {
                conversation.groupMembers = [];
            }
            newMembers.forEach((memberId) => {
                conversation.groupMembers.push({
                    userId: memberId,
                    role: 'member',
                    joinedAt: new Date()
                });
            });
            yield conversation.save();
        }
        yield group.populate('adminId', 'username profilePictureUrl');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.json({ group, addedMembers: newMembers });
    }
    catch (error) {
        console.error('Error adding members:', error);
        return res.status(500).json({ error: 'Failed to add members' });
    }
});
exports.addMembers = addMembers;
// DELETE /api/groups/:groupId/members/:userId - Remove member (admin only)
const removeMember = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId, userId: memberToRemove } = req.params;
        const group = yield Group_1.default.findById(groupId);
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
        yield group.save();
        // Update conversation
        const conversation = yield Conversation_1.default.findById(group.conversationId);
        if (conversation) {
            conversation.participants = conversation.participants.filter(id => id.toString() !== memberToRemove);
            if (conversation.groupMembers) {
                conversation.groupMembers = conversation.groupMembers.filter(member => member.userId.toString() !== memberToRemove);
            }
            yield conversation.save();
        }
        return res.json({ message: 'Member removed successfully', removedMember: memberToRemove });
    }
    catch (error) {
        console.error('Error removing member:', error);
        return res.status(500).json({ error: 'Failed to remove member' });
    }
});
exports.removeMember = removeMember;
// POST /api/groups/:groupId/leave - Leave group
const leaveGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const group = yield Group_1.default.findById(groupId);
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
        yield group.save();
        // Update conversation
        const conversation = yield Conversation_1.default.findById(group.conversationId);
        if (conversation) {
            conversation.participants = conversation.participants.filter(id => id.toString() !== userId);
            if (conversation.groupMembers) {
                conversation.groupMembers = conversation.groupMembers.filter(member => member.userId.toString() !== userId);
            }
            yield conversation.save();
        }
        return res.json({ message: 'Left group successfully' });
    }
    catch (error) {
        console.error('Error leaving group:', error);
        return res.status(500).json({ error: 'Failed to leave group' });
    }
});
exports.leaveGroup = leaveGroup;
// PUT /api/groups/:groupId/admin - Transfer admin rights
const transferAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const { newAdminId } = req.body;
        if (!newAdminId) {
            return res.status(400).json({ error: 'New admin ID is required' });
        }
        const group = yield Group_1.default.findById(groupId);
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
        yield group.save();
        // Update conversation groupMembers roles
        const conversation = yield Conversation_1.default.findById(group.conversationId);
        if (conversation && conversation.groupMembers) {
            const oldAdminMember = conversation.groupMembers.find(member => member.userId.toString() === oldAdminId.toString());
            const newAdminMember = conversation.groupMembers.find(member => member.userId.toString() === newAdminId);
            if (oldAdminMember)
                oldAdminMember.role = 'member';
            if (newAdminMember)
                newAdminMember.role = 'admin';
            yield conversation.save();
        }
        yield group.populate('adminId', 'username profilePictureUrl');
        yield group.populate('memberIds', 'username profilePictureUrl onlineStatus');
        return res.json({ group, message: 'Admin rights transferred successfully' });
    }
    catch (error) {
        console.error('Error transferring admin:', error);
        return res.status(500).json({ error: 'Failed to transfer admin rights' });
    }
});
exports.transferAdmin = transferAdmin;
// GET /api/groups/:groupId/messages - Get group messages
const getGroupMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const { groupId } = req.params;
        const { limit = 50, before } = req.query;
        const group = yield Group_1.default.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        // Check if user is a member
        const isMember = group.memberIds.some(id => id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }
        const query = {
            conversationId: group.conversationId,
            isDeleted: { $ne: true }
        };
        if (before && typeof before === 'string') {
            query._id = { $lt: before };
        }
        const messages = yield Message_1.default.find(query)
            .sort({ sentAt: -1 })
            .limit(Number(limit))
            .populate('senderId', 'username profilePictureUrl');
        return res.json({ messages: messages.reverse() });
    }
    catch (error) {
        console.error('Error fetching group messages:', error);
        return res.status(500).json({ error: 'Failed to fetch group messages' });
    }
});
exports.getGroupMessages = getGroupMessages;
