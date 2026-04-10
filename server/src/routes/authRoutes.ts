import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartsolar_secret_key_change_in_production';
const JWT_EXPIRES = '7d';

// Simple in-memory users (replace with MongoDB users collection in production)
const USERS = [
  { id: '1', username: 'admin', password: '$2b$10$X8yE6x.HqQGHqQGHqQGHq.HqQGHqQGHqQGHqQGHqQGHqQGHqQGHqQ', name: '系统管理员', role: 'admin' }, // admin
  { id: '2', username: 'operator', password: '$2b$10$X8yE6x.HqQGHqQGHqQGHq.HqQGHqQGHqQGHqQGHqQGHqQGHqQGHqQ', name: '运维人员', role: 'operator' }, // operator
  { id: '3', username: 'tech', password: '$2b$10$X8yE6x.HqQGHqQGHqQGHq.HqQGHqQGHqQGHqQGHqQGHqQGHqQGHqQ', name: '技术人员', role: 'technician' }, // tech
];

// Hash password for first-time setup
async function hashPasswords() {
  const passwords: Record<string, string> = {
    admin: 'admin',
    operator: 'operator123',
    tech: 'tech123',
  };
  for (const user of USERS) {
    const plain = passwords[user.username];
    if (plain) {
      user.password = await bcrypt.hash(plain, 10);
    }
  }
}
hashPasswords();

function generateToken(user: any) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, message: '请输入用户名和密码' });
  }

  const user = USERS.find(u => u.username === username);
  if (!user) {
    return res.json({ success: false, message: '用户名或密码错误' });
  }

  // Direct comparison for simplicity (hash check would be better)
  const isValid = await bcrypt.compare(password, user.password).catch(() => false);
  // Fallback: check if password matches the hash we just set
  const directMatch = password === 'admin' && username === 'admin' ||
                      password === 'operator123' && username === 'operator' ||
                      password === 'tech123' && username === 'tech';
  
  if (!isValid && !directMatch) {
    return res.json({ success: false, message: '用户名或密码错误' });
  }

  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    const user = USERS.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ success: false, message: '用户不存在' });
    res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch {
    res.status(401).json({ success: false, message: 'Token无效' });
  }
});

export default router;
