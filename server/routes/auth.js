import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database.js';

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

        // Return user data (without password hash)
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.department_id,
          createdAt: user.created_at,
          lastLogin: new Date().toISOString(),
          isActive: Boolean(user.is_active)
        };

        res.json({
          user: userData,
          token: 'demo-token', // In a real app, generate a JWT token
          message: 'Login successful'
        });

      } catch (error) {
        console.error('Password comparison error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );
});

// Logout endpoint (optional, mainly clears server-side sessions if using them)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;