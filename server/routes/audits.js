import express from 'express';
import { db } from '../database.js';
import crypto from 'crypto';

const router = express.Router();

// Get all audits
router.get('/', (req, res) => {
  db.all("SELECT * FROM audits", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Transform database fields to match frontend expectations
    const audits = rows.map(row => ({
      id: row.id,
      softwareId: row.software_id,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      frequency: row.frequency,
      notes: row.notes,
      checklist: {
        verifyActiveUsers: Boolean(row.verify_active_users),
        checkSeatUtilization: Boolean(row.check_seat_utilization),
        reviewFeatureUsage: Boolean(row.review_feature_usage),
        updateDepartmentAllocation: Boolean(row.update_department_allocation),
        verifyActiveUsersCompleted: Boolean(row.verify_active_users_completed),
        checkSeatUtilizationCompleted: Boolean(row.check_seat_utilization_completed),
        reviewFeatureUsageCompleted: Boolean(row.review_feature_usage_completed),
        updateDepartmentAllocationCompleted: Boolean(row.update_department_allocation_completed)
      },
      currentSeatsUsed: row.current_seats_used,
      currentUsageAmount: row.current_usage_amount,
      usageMetricSnapshot: row.usage_metric_snapshot,
      auditFindings: row.audit_findings,
      recommendedActions: row.recommended_actions
    }));
    
    res.json(audits);
  });
});

// Get audits for specific software
router.get('/software/:softwareId', (req, res) => {
  const { softwareId } = req.params;
  db.all("SELECT * FROM audits WHERE software_id = ?", [softwareId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Transform database fields to match frontend expectations
    const audits = rows.map(row => ({
      id: row.id,
      softwareId: row.software_id,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      frequency: row.frequency,
      notes: row.notes,
      checklist: {
        verifyActiveUsers: Boolean(row.verify_active_users),
        checkSeatUtilization: Boolean(row.check_seat_utilization),
        reviewFeatureUsage: Boolean(row.review_feature_usage),
        updateDepartmentAllocation: Boolean(row.update_department_allocation),
        verifyActiveUsersCompleted: Boolean(row.verify_active_users_completed),
        checkSeatUtilizationCompleted: Boolean(row.check_seat_utilization_completed),
        reviewFeatureUsageCompleted: Boolean(row.review_feature_usage_completed),
        updateDepartmentAllocationCompleted: Boolean(row.update_department_allocation_completed)
      },
      currentSeatsUsed: row.current_seats_used,
      currentUsageAmount: row.current_usage_amount,
      usageMetricSnapshot: row.usage_metric_snapshot,
      auditFindings: row.audit_findings,
      recommendedActions: row.recommended_actions
    }));
    
    res.json(audits);
  });
});

// Create audit
router.post('/', (req, res) => {
  const {
    softwareId, scheduledDate, frequency, notes,
    checklist
  } = req.body;
  
  const id = crypto.randomUUID();
  
  db.run(`INSERT INTO audits (
    id, software_id, scheduled_date, frequency, notes,
    verify_active_users, check_seat_utilization,
    review_feature_usage, update_department_allocation
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, softwareId, scheduledDate, frequency, notes,
   checklist.verifyActiveUsers, checklist.checkSeatUtilization,
   checklist.reviewFeatureUsage, checklist.updateDepartmentAllocation], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const newAudit = {
      id,
      softwareId,
      scheduledDate,
      frequency,
      notes,
      checklist
    };
    
    res.status(201).json(newAudit);
  });
});

// Update audit
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { updatedSoftware, ...updates } = req.body;
  
  // Build dynamic update query
  const fields = [];
  const values = [];
  
  const fieldMap = {
    scheduledDate: 'scheduled_date',
    completedDate: 'completed_date',
    frequency: 'frequency',
    notes: 'notes',
    currentSeatsUsed: 'current_seats_used',
    currentUsageAmount: 'current_usage_amount',
    usageMetricSnapshot: 'usage_metric_snapshot',
    auditFindings: 'audit_findings',
    recommendedActions: 'recommended_actions'
  };
  
  Object.keys(updates).forEach(key => {
    if (fieldMap[key]) {
      fields.push(`${fieldMap[key]} = ?`);
      values.push(updates[key]);
    }
  });
  
  // Handle checklist updates
  if (updates.checklist) {
    const checklistMap = {
      verifyActiveUsers: 'verify_active_users',
      checkSeatUtilization: 'check_seat_utilization',
      reviewFeatureUsage: 'review_feature_usage',
      updateDepartmentAllocation: 'update_department_allocation',
      verifyActiveUsersCompleted: 'verify_active_users_completed',
      checkSeatUtilizationCompleted: 'check_seat_utilization_completed',
      reviewFeatureUsageCompleted: 'review_feature_usage_completed',
      updateDepartmentAllocationCompleted: 'update_department_allocation_completed'
    };
    
    Object.keys(updates.checklist).forEach(key => {
      if (checklistMap[key]) {
        fields.push(`${checklistMap[key]} = ?`);
        values.push(updates.checklist[key]);
      }
    });
  }
  
  if (fields.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }
  
  values.push(id);
  
  db.run(`UPDATE audits SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }
    
    // Update software if provided
    if (updatedSoftware && Object.keys(updatedSoftware).length > 0) {
      // Get the software ID from the audit
      db.get("SELECT software_id FROM audits WHERE id = ?", [id], (err, auditRow) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (!auditRow) {
          res.status(404).json({ error: 'Audit not found' });
          return;
        }
        
        // Update software record
        const softwareFields = [];
        const softwareValues = [];
        
        const softwareFieldMap = {
          seatsUtilized: 'seats_utilized',
          currentUsage: 'current_usage',
          usageMetric: 'usage_metric'
        };
        
        Object.keys(updatedSoftware).forEach(key => {
          if (softwareFieldMap[key]) {
            softwareFields.push(`${softwareFieldMap[key]} = ?`);
            softwareValues.push(updatedSoftware[key]);
          }
        });
        
        if (softwareFields.length > 0) {
          softwareValues.push(auditRow.software_id);
          
          db.run(`UPDATE software SET ${softwareFields.join(', ')} WHERE id = ?`, softwareValues, (err) => {
            if (err) {
              console.error('Error updating software from audit:', err);
              // Don't fail the audit update if software update fails
            }
            
            returnUpdatedAudit();
          });
        } else {
          returnUpdatedAudit();
        }
      });
    } else {
      returnUpdatedAudit();
    }
    
    function returnUpdatedAudit() {
      // Return updated audit
      db.get("SELECT * FROM audits WHERE id = ?", [id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const audit = {
          id: row.id,
          softwareId: row.software_id,
          scheduledDate: row.scheduled_date,
          completedDate: row.completed_date,
          frequency: row.frequency,
          notes: row.notes,
          checklist: {
            verifyActiveUsers: Boolean(row.verify_active_users),
            checkSeatUtilization: Boolean(row.check_seat_utilization),
            reviewFeatureUsage: Boolean(row.review_feature_usage),
            updateDepartmentAllocation: Boolean(row.update_department_allocation),
            verifyActiveUsersCompleted: Boolean(row.verify_active_users_completed),
            checkSeatUtilizationCompleted: Boolean(row.check_seat_utilization_completed),
            reviewFeatureUsageCompleted: Boolean(row.review_feature_usage_completed),
            updateDepartmentAllocationCompleted: Boolean(row.update_department_allocation_completed)
          },
          currentSeatsUsed: row.current_seats_used,
          currentUsageAmount: row.current_usage_amount,
          usageMetricSnapshot: row.usage_metric_snapshot,
          auditFindings: row.audit_findings,
          recommendedActions: row.recommended_actions
        };
        
        res.json(audit);
      });
    }
  });
});

export default router;