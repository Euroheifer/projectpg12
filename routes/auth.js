const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// 用户登录
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    
    // 这里应该查询数据库验证用户
    // 示例用户验证逻辑
    const user = await verifyUser(email, password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 用户注册
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 创建用户
    const newUser = await createUser({
      email,
      password: hashedPassword,
      name
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 验证 token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email
    }
  });
});

// 刷新 token
router.post('/refresh', authenticateToken, (req, res) => {
  const token = jwt.sign(
    { userId: req.user.userId, email: req.user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
  );

  res.json({
    success: true,
    token
  });
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Could not log out'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
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
async function verifyUser(email, password) {
  // TODO: 实现真实的用户验证逻辑
  return {
    id: 1,
    email: email,
    name: 'Test User',
    role: 'user'
  };
}

async function findUserByEmail(email) {
  // TODO: 实现真实的用户查找逻辑
  return null;
}

async function createUser(userData) {
  // TODO: 实现真实的用户创建逻辑
  return {
    id: 1,
    ...userData,
    password: undefined
  };
}

module.exports = router;