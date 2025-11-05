const express = require('express');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

// 获取用户的所有群组
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const groups = await getUserGroups(userId);
    
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      error: 'Failed to fetch groups'
    });
  }
});

// 创建新群组
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('currency').optional().isLength({ min: 3, max: 3 }).toUpperCase()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.userId;
    const { name, description, currency } = req.body;

    const newGroup = await createGroup({
      name,
      description,
      currency: currency || 'USD',
      ownerId: userId,
      members: [userId]
    });

    res.status(201).json({
      success: true,
      data: newGroup,
      message: 'Group created successfully'
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      error: 'Failed to create group'
    });
  }
});

// 获取特定群组详情
router.get('/:groupId', [
  param('groupId').isInt()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { groupId } = req.params;
    const userId = req.user.userId;

    // 检查用户是否是群组成员
    const isMember = await checkGroupMembership(groupId, userId);
    if (!isMember) {
      return res.status(403).json({
        error: 'Access denied: not a group member'
      });
    }

    const group = await getGroupDetails(groupId);
    
    res.json({
      success: true,
      data: group
    });

  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({
      error: 'Failed to fetch group details'
    });
  }
});

// 更新群组信息
router.patch('/:groupId', [
  param('groupId').isInt(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('currency').optional().isLength({ min: 3, max: 3 }).toUpperCase()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { groupId } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // 检查用户是否是群组管理员
    const isAdmin = await checkGroupAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied: admin privileges required'
      });
    }

    const updatedGroup = await updateGroup(groupId, updates);

    res.json({
      success: true,
      data: updatedGroup,
      message: 'Group updated successfully'
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      error: 'Failed to update group'
    });
  }
});

// 删除群组
router.delete('/:groupId', [
  param('groupId').isInt()
], authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // 检查用户是否是群组管理员
    const isAdmin = await checkGroupAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Access denied: admin privileges required'
      });
    }

    await deleteGroup(groupId);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      error: 'Failed to delete group'
    });
  }
});

// 邀请成员
router.post('/:groupId/invite', [
  param('groupId').isInt(),
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { groupId } = req.params;
    const userId = req.user.userId;
    const { email, role } = req.body;

    // 检查用户权限
    const canInvite = await checkGroupMembership(groupId, userId);
    if (!canInvite) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const invitation = await createInvitation({
      groupId,
      email,
      role: role || 'member',
      invitedBy: userId
    });

    // TODO: 发送邮件通知
    await sendInvitationEmail(email, invitation);

    res.json({
      success: true,
      data: invitation,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      error: 'Failed to send invitation'
    });
  }
});

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
}

// 模拟数据库函数（实际项目中应该替换为真实的数据库操作）
async function getUserGroups(userId) {
  // TODO: 实现真实的群组查询逻辑
  return [];
}

async function createGroup(groupData) {
  // TODO: 实现真实的群组创建逻辑
  return {
    id: 1,
    ...groupData,
    createdAt: new Date().toISOString()
  };
}

async function getGroupDetails(groupId) {
  // TODO: 实现真实的群组详情查询逻辑
  return {
    id: parseInt(groupId),
    name: 'Sample Group',
    members: [],
    expenses: []
  };
}

async function checkGroupMembership(groupId, userId) {
  // TODO: 实现真实的成员检查逻辑
  return true;
}

async function checkGroupAdmin(groupId, userId) {
  // TODO: 实现真实的管理员检查逻辑
  return true;
}

async function updateGroup(groupId, updates) {
  // TODO: 实现真实的群组更新逻辑
  return {
    id: parseInt(groupId),
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

async function deleteGroup(groupId) {
  // TODO: 实现真实的群组删除逻辑
  return true;
}

async function createInvitation(invitationData) {
  // TODO: 实现真实的邀请创建逻辑
  return {
    id: 1,
    ...invitationData,
    createdAt: new Date().toISOString()
  };
}

async function sendInvitationEmail(email, invitation) {
  // TODO: 实现真实的邮件发送逻辑
  console.log(`Sending invitation to ${email}`);
}

module.exports = router;