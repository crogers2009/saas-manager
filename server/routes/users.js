import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database.js';

const router = express.Router();

// Get all users (without password hashes)
router.get('/', (req, res) => {
  db.all(
    "SELECT id, name, email, role, created_at, last_login, is_active, must_change_password FROM users ORDER BY name",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Get department relationships for all users
      const userIds = rows.map(row => row.id);
      if (userIds.length === 0) {
        res.json([]);
        return;
      }
      
      const placeholders = userIds.map(() => '?').join(',');
      db.all(
        `SELECT user_id, department_id FROM user_departments WHERE user_id IN (${placeholders})`,
        userIds,
        (err, deptRows) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Group departments by user
          const userDepartments = {};
          deptRows.forEach(row => {
            if (!userDepartments[row.user_id]) {
              userDepartments[row.user_id] = [];
            }
            userDepartments[row.user_id].push(row.department_id);
          });
          
          // Transform database fields to match frontend expectations
          const users = rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            departmentIds: userDepartments[row.id] || [],
            createdAt: row.created_at,
            lastLogin: row.last_login,
            isActive: Boolean(row.is_active),
            mustChangePassword: Boolean(row.must_change_password)
          }));
          
          res.json(users);
        }
      );
    }
  );
});

// Get user by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT id, name, email, role, created_at, last_login, is_active, must_change_password FROM users WHERE id = ?",
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
      
      // Get department relationships for this user
      db.all(
        "SELECT department_id FROM user_departments WHERE user_id = ?",
        [id],
        (err, deptRows) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const user = {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            departmentIds: deptRows.map(dept => dept.department_id),
            createdAt: row.created_at,
            lastLogin: row.last_login,
            isActive: Boolean(row.is_active),
            mustChangePassword: Boolean(row.must_change_password)
          };
          
          res.json(user);
        }
      );
    }
  );
});

// Create new user
router.post('/', async (req, res) => {
  const { name, email, role, password = 'firstacceptance', departmentIds = [], isActive = true } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
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
          'INSERT INTO users (id, name, email, role, password_hash, created_at, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name, email, role, passwordHash, createdAt, isActive ? 1 : 0, 1],
          function(err) {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Failed to create user' });
            }

            // Insert department relationships if any
            if (departmentIds.length > 0) {
              const deptStmt = db.prepare("INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)");
              departmentIds.forEach(deptId => {
                deptStmt.run(id, deptId);
              });
              deptStmt.finalize();
            }

            const newUser = {
              id,
              name,
              email,
              role,
              departmentIds,
              createdAt,
              lastLogin: null,
              isActive,
              mustChangePassword: true
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
  const { name, email, role, password, departmentIds, isActive } = req.body;

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

        // Update department relationships if provided
        if (departmentIds !== undefined) {
          db.run("DELETE FROM user_departments WHERE user_id = ?", [id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to update department relationships' });
            }
            
            if (departmentIds.length > 0) {
              const deptStmt = db.prepare("INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)");
              departmentIds.forEach(deptId => {
                deptStmt.run(id, deptId);
              });
              deptStmt.finalize();
            }
            
            returnUpdatedUser();
          });
        } else {
          returnUpdatedUser();
        }
        
        function returnUpdatedUser() {
          // Return updated user
          db.get(
            'SELECT id, name, email, role, created_at, last_login, is_active, must_change_password FROM users WHERE id = ?',
            [id],
            (err, row) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to fetch updated user' });
              }

              // Get department relationships
              db.all(
                "SELECT department_id FROM user_departments WHERE user_id = ?",
                [id],
                (err, deptRows) => {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to fetch user departments' });
                  }
                  
                  const updatedUser = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role,
                    departmentIds: deptRows.map(dept => dept.department_id),
                    createdAt: row.created_at,
                    lastLogin: row.last_login,
                    isActive: Boolean(row.is_active),
                    mustChangePassword: Boolean(row.must_change_password)
                  };

                  res.json(updatedUser);
                }
              );
            }
          );
        }
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

// Reset user password
router.post('/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const defaultPassword = 'firstacceptance';

  try {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      [passwordHash, id],
      function(err) {
        if (err) {
          console.error('Error resetting password:', err);
          return res.status(500).json({ error: 'Failed to reset password' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password reset successfully. User will be prompted to change password on next login.' });
      }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;