import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { JWT_SECRET } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user by email
  db.get(
    'SELECT * FROM users WHERE email = ? AND is_active = 1',
    [email],
    async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      try {
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        db.run(
          'UPDATE users SET last_login = ? WHERE id = ?',
          [new Date().toISOString(), user.id],
          (err) => {
            if (err) {
              console.error('Error updating last login:', err);
            }
          }
        );

        // Return user data (without password hash) - simplified for Admins
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentIds: user.role === 'Administrator' ? [] : [], // TODO: Handle departments for non-admin users
          createdAt: user.created_at,
          lastLogin: new Date().toISOString(),
          isActive: Boolean(user.is_active),
          mustChangePassword: Boolean(user.must_change_password)
        };

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, role: user.role },
          JWT_SECRET,
          { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Send token in a secure, http-only cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
          sameSite: 'strict', // Prevent CSRF attacks
          maxAge: 3600000, // 1 hour
        });

        res.json({
          user: userData,
          message: 'Login successful'
        });

      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Get authenticated user's data
router.get('/me', authenticateUser, (req, res) => {
  // req.user is populated by the authenticateUser middleware
  console.log('Auth /me endpoint hit. req.user:', req.user);
  if (!req.user || !req.user.id) {
    console.error('req.user or req.user.id is missing after authentication', req.user);
    return res.status(400).json({ error: 'User information missing from token' });
  }

  db.get(
    'SELECT id, name, email, role, created_at, last_login, is_active, must_change_password FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('Database error fetching user for /me:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!user) {
        console.warn('User not found in DB for ID from token:', req.user.id);
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Handle department relationships based on user role
      if (user.role === 'Administrator') {
        // Admins don't need department assignments
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentIds: [], // Admins have access to all departments
          createdAt: user.created_at,
          lastLogin: user.last_login,
          isActive: Boolean(user.is_active),
          mustChangePassword: Boolean(user.must_change_password)
        };
        res.json({ user: userData });
      } else {
        // Get department relationships for non-Admin users
        db.all(
          "SELECT department_id FROM user_departments WHERE user_id = ?",
          [user.id],
          (err, deptRows) => {
            if (err) {
              console.error('Database error fetching user departments:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            
            const userData = {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              departmentIds: deptRows.map(dept => dept.department_id),
              createdAt: user.created_at,
              lastLogin: user.last_login,
              isActive: Boolean(user.is_active),
              mustChangePassword: Boolean(user.must_change_password)
            };
            res.json({ user: userData });
          }
        );
      }
    }
  );
});

// Change password endpoint
router.post('/change-password', authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    // Get current user with password hash
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      try {
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password and clear must_change_password flag
        db.run(
          'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
          [newPasswordHash, userId],
          function(err) {
            if (err) {
              console.error('Error updating password:', err);
              return res.status(500).json({ error: 'Failed to update password' });
            }

            res.json({ message: 'Password changed successfully' });
          }
        );

      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;