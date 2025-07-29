import express from 'express';
import { db } from '../database.js';
import crypto from 'crypto';

const router = express.Router();

// Get all feature tags
router.get('/', (req, res) => {
  db.all("SELECT * FROM feature_tags ORDER BY name", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get feature tag by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM feature_tags WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Feature tag not found' });
      return;
    }
    res.json(row);
  });
});

// Create feature tag
router.post('/', (req, res) => {
  const { name } = req.body;
  
  // Check if tag already exists
  db.get("SELECT * FROM feature_tags WHERE LOWER(name) = LOWER(?)", [name], (err, existing) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existing) {
      res.json(existing);
      return;
    }
    
    const id = crypto.randomUUID();
    db.run("INSERT INTO feature_tags (id, name) VALUES (?, ?)", [id, name], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.status(201).json({ id, name });
    });
  });
});

export default router;