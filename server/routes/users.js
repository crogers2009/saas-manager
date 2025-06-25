import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database.js';

const router = express.Router();

// Get all users (without password hashes)
router.get('/', (req, res) => {
  db.all(
    "SELECT id, name, email, role, department_id, created_at, last_login, is_active FROM users ORDER BY name",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Transform database fields to match frontend expectations
      const users = rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        departmentId: row.department_id,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        isActive: Boolean(row.is_active)
      }));
      
      res.json(users);
    }
  );
});

// Get user by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT id, name, email, role, department_id, created_at, last_login, is_active FROM users WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      const user = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        departmentId: row.department_id,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        isActive: Boolean(row.is_active)
      };
      
      res.json(user);
    }
  );
});

// Create new user
router.post('/', async (req, res) => {
  const { name, email, role, password, departmentId, isActive = true } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'Name, email, role, and password are required' });
  }

  try {
    // Check if email already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      try {
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        db.run(
          'INSERT INTO users (id, name, email, role, department_id, password_hash, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, email, role, departmentId, passwordHash, createdAt, isActive ? 1 : 0],
          function(err) {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Failed to create user' });
            }

            const newUser = {
              id,
              name,
              email,
              role,
              departmentId,
              createdAt,
              lastLogin: null,
              isActive
            };

            res.status(201).json(newUser);
          }
        );
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({ error: 'Failed to create user' });
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password, departmentId, isActive } = req.body;

  try {
    // Build dynamic update query
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      values.push(role);
    }
    if (departmentId !== undefined) {
      fields.push('department_id = ?');
      values.push(departmentId);
    }
    if (isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    // Handle password update if provided
    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    db.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          console.error('Error updating user:', err);
          return res.status(500).json({ error: 'Failed to update user' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Return updated user
        db.get(
          'SELECT id, name, email, role, department_id, created_at, last_login, is_active FROM users WHERE id = ?',
          [id],
          (err, row) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch updated user' });
            }

            const updatedUser = {
              id: row.id,
              name: row.name,
              email: row.email,
              role: row.role,
              departmentId: row.department_id,
              createdAt: row.created_at,
              lastLogin: row.last_login,
              isActive: Boolean(row.is_active)
            };

            res.json(updatedUser);
          }
        );
      }
    );
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

export default router;