import express from 'express';
import { db } from '../database.js';
import crypto from 'crypto';

const router = express.Router();

// Get all software requests
router.get('/', (req, res) => {
  db.all("SELECT * FROM software_requests", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Transform database fields to match frontend expectations
    const requests = rows.map(row => ({
      id: row.id,
      type: row.type,
      requesterId: row.requester_id,
      requestDate: row.request_date,
      status: row.status,
      businessJustification: row.business_justification,
      softwareName: row.software_name,
      vendorName: row.vendor_name,
      estimatedCost: row.estimated_cost,
      numUsersNeeded: row.num_users_needed,
      problemToSolve: row.problem_to_solve,
      currentPainPoints: row.current_pain_points,
      featureRequirements: row.feature_requirements,
      budgetRange: row.budget_range,
      timeline: row.timeline
    }));
    
    res.json(requests);
  });
});

// Get software request by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM software_requests WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Software request not found' });
      return;
    }
    
    // Transform database fields to match frontend expectations
    const request = {
      id: row.id,
      type: row.type,
      requesterId: row.requester_id,
      requestDate: row.request_date,
      status: row.status,
      businessJustification: row.business_justification,
      softwareName: row.software_name,
      vendorName: row.vendor_name,
      estimatedCost: row.estimated_cost,
      numUsersNeeded: row.num_users_needed,
      problemToSolve: row.problem_to_solve,
      currentPainPoints: row.current_pain_points,
      featureRequirements: row.feature_requirements,
      budgetRange: row.budget_range,
      timeline: row.timeline
    };
    
    res.json(request);
  });
});

// Create software request
router.post('/', (req, res) => {
  const {
    type, requesterId, businessJustification,
    softwareName, vendorName, estimatedCost, numUsersNeeded,
    problemToSolve, currentPainPoints, featureRequirements,
    budgetRange, timeline
  } = req.body;
  
  const id = crypto.randomUUID();
  const requestDate = new Date().toISOString();
  const status = 'Pending';
  
  db.run(`INSERT INTO software_requests (
    id, type, requester_id, request_date, status, business_justification,
    software_name, vendor_name, estimated_cost, num_users_needed,
    problem_to_solve, current_pain_points, feature_requirements,
    budget_range, timeline
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, type, requesterId, requestDate, status, businessJustification,
   softwareName, vendorName, estimatedCost, numUsersNeeded,
   problemToSolve, currentPainPoints, featureRequirements,
   budgetRange, timeline], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Return the created request
    const newRequest = {
      id,
      type,
      requesterId,
      requestDate,
      status,
      businessJustification,
      softwareName,
      vendorName,
      estimatedCost,
      numUsersNeeded,
      problemToSolve,
      currentPainPoints,
      featureRequirements,
      budgetRange,
      timeline
    };
    
    res.status(201).json(newRequest);
  });
});

// Update software request
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Build dynamic update query
  const fields = [];
  const values = [];
  
  const fieldMap = {
    type: 'type',
    requesterId: 'requester_id',
    status: 'status',
    businessJustification: 'business_justification',
    softwareName: 'software_name',
    vendorName: 'vendor_name',
    estimatedCost: 'estimated_cost',
    numUsersNeeded: 'num_users_needed',
    problemToSolve: 'problem_to_solve',
    currentPainPoints: 'current_pain_points',
    featureRequirements: 'feature_requirements',
    budgetRange: 'budget_range',
    timeline: 'timeline'
  };
  
  Object.keys(updates).forEach(key => {
    if (fieldMap[key]) {
      fields.push(`${fieldMap[key]} = ?`);
      values.push(updates[key]);
    }
  });
  
  if (fields.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }
  
  values.push(id);
  
  db.run(`UPDATE software_requests SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Software request not found' });
      return;
    }
    
    // Return updated request
    db.get("SELECT * FROM software_requests WHERE id = ?", [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const request = {
        id: row.id,
        type: row.type,
        requesterId: row.requester_id,
        requestDate: row.request_date,
        status: row.status,
        businessJustification: row.business_justification,
        softwareName: row.software_name,
        vendorName: row.vendor_name,
        estimatedCost: row.estimated_cost,
        numUsersNeeded: row.num_users_needed,
        problemToSolve: row.problem_to_solve,
        currentPainPoints: row.current_pain_points,
        featureRequirements: row.feature_requirements,
        budgetRange: row.budget_range,
        timeline: row.timeline
      };
      
      res.json(request);
    });
  });
});

export default router;