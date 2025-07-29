import express from 'express';
import { db } from '../database.js';
import { authenticateUser } from '../middleware/auth.js';
import crypto from 'crypto';
const router = express.Router();

// Get all cost centers
router.get('/', authenticateUser, (req, res) => {
  const query = `
    SELECT 
      id, code, name, description, is_active, created_at, updated_at
    FROM cost_centers 
    WHERE is_active = 1
    ORDER BY code ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const costCenters = rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(costCenters);
  });
});

// Get single cost center
router.get('/:id', authenticateUser, (req, res) => {
  const { id } = req.params;
  
  db.get(
    "SELECT id, code, name, description, is_active, created_at, updated_at FROM cost_centers WHERE id = ?",
    [id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!row) {
        res.status(404).json({ error: 'Cost center not found' });
        return;
      }
      
      const costCenter = {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      res.json(costCenter);
    }
  );
});

// Create new cost center (admin only)
router.post('/', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can create cost centers' });
  }
  
  const { code, name, description } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }
  
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  db.run(
    `INSERT INTO cost_centers (id, code, name, description, is_active, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, code.toUpperCase(), name, description || null, 1, now, now],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          res.status(400).json({ error: 'Cost center code already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      
      // Return the created cost center
      db.get(
        "SELECT id, code, name, description, is_active, created_at, updated_at FROM cost_centers WHERE id = ?",
        [id],
        (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const costCenter = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
          
          res.status(201).json(costCenter);
        }
      );
    }
  );
});

// Update cost center (admin only)
router.put('/:id', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can update cost centers' });
  }
  
  const { id } = req.params;
  const { code, name, description, isActive } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }
  
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE cost_centers 
     SET code = ?, name = ?, description = ?, is_active = ?, updated_at = ? 
     WHERE id = ?`,
    [code.toUpperCase(), name, description || null, isActive ? 1 : 0, now, id],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          res.status(400).json({ error: 'Cost center code already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Cost center not found' });
        return;
      }
      
      // Return the updated cost center
      db.get(
        "SELECT id, code, name, description, is_active, created_at, updated_at FROM cost_centers WHERE id = ?",
        [id],
        (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const costCenter = {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
          
          res.json(costCenter);
        }
      );
    }
  );
});

// Delete cost center (admin only)
router.delete('/:id', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can delete cost centers' });
  }
  
  const { id } = req.params;
  
  // Check if cost center is in use by any software
  db.get(
    "SELECT COUNT(*) as count FROM software WHERE cost_center_code = (SELECT code FROM cost_centers WHERE id = ?)",
    [id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (row.count > 0) {
        res.status(400).json({ 
          error: `Cannot delete cost center. It is currently used by ${row.count} software item(s).` 
        });
        return;
      }
      
      // Safe to delete
      db.run("DELETE FROM cost_centers WHERE id = ?", [id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (this.changes === 0) {
          res.status(404).json({ error: 'Cost center not found' });
          return;
        }
        
        res.json({ message: 'Cost center deleted successfully' });
      });
    }
  );
});


export default router;