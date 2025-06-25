import express from 'express';
import { db } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all departments
router.get('/', (req, res) => {
  db.all("SELECT * FROM departments", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get department by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM departments WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json(row);
  });
});

// Create new department
router.post('/', (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Department name is required' });
    return;
  }

  const id = uuidv4();
  db.run("INSERT INTO departments (id, name) VALUES (?, ?)", [id, name], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Department name already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.status(201).json({ id, name });
  });
});

// Update department
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Department name is required' });
    return;
  }

  db.run("UPDATE departments SET name = ? WHERE id = ?", [name, id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Department name already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json({ id, name });
  });
});

// Delete department
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM departments WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json({ message: 'Department deleted successfully' });
  });
});

export default router;