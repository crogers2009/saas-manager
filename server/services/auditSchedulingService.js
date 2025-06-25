import { db } from '../database.js';
import crypto from 'crypto';

// Calculate next audit date based on frequency
const calculateNextAuditDate = (lastAuditDate, frequency) => {
  const date = lastAuditDate ? new Date(lastAuditDate) : new Date();
  
  switch (frequency) {
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'Annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'None':
      return null; // No audits scheduled
    default:
      date.setMonth(date.getMonth() + 3); // Default to quarterly
      break;
  }
  
  return date;
};

// Get distribution offset to spread audits across the period
const getDistributionOffset = async (frequency) => {
  return new Promise((resolve, reject) => {
    let query = '';
    
    switch (frequency) {
      case 'Monthly':
        // Spread across 30 days
        query = `
          SELECT COUNT(*) as count 
          FROM audits 
          WHERE julianday(scheduled_date) >= julianday('now', 'start of month') 
            AND julianday(scheduled_date) < julianday('now', 'start of month', '+1 month')
            AND completed_date IS NULL
        `;
        break;
      case 'Quarterly':
        // Spread across 90 days
        query = `
          SELECT COUNT(*) as count 
          FROM audits 
          WHERE julianday(scheduled_date) >= julianday('now', 'start of month', '-' || ((strftime('%m', 'now') - 1) % 3) || ' months') 
            AND julianday(scheduled_date) < julianday('now', 'start of month', '-' || ((strftime('%m', 'now') - 1) % 3) || ' months', '+3 months')
            AND completed_date IS NULL
        `;
        break;
      case 'Annually':
        // Spread across 365 days
        query = `
          SELECT COUNT(*) as count 
          FROM audits 
          WHERE julianday(scheduled_date) >= julianday('now', 'start of year') 
            AND julianday(scheduled_date) < julianday('now', 'start of year', '+1 year')
            AND completed_date IS NULL
        `;
        break;
      default:
        resolve(0);
        return;
    }

    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        // Calculate offset in days to spread audits
        const count = row ? row.count : 0;
        let maxDays;
        
        switch (frequency) {
          case 'Monthly': maxDays = 28; break;
          case 'Quarterly': maxDays = 85; break;
          case 'Annually': maxDays = 350; break;
          default: maxDays = 85; break;
        }
        
        // Distribute evenly with some randomness
        const baseOffset = Math.floor((count * 7) % maxDays);
        const randomOffset = Math.floor(Math.random() * 7); // Add 0-6 days randomness
        const totalOffset = (baseOffset + randomOffset) % maxDays;
        
        resolve(totalOffset);
      }
    });
  });
};

// Create initial audit for new software or when frequency changes
export const scheduleInitialAudit = async (softwareId, frequency) => {
  if (frequency === 'None') {
    // Delete any existing pending audits for this software
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM audits WHERE software_id = ? AND completed_date IS NULL", [softwareId], (err) => {
        if (err) reject(err);
        else resolve({ message: 'Audits disabled for this software' });
      });
    });
  }

  try {
    // Calculate next audit date with distribution
    const baseDate = calculateNextAuditDate(null, frequency);
    const offset = await getDistributionOffset(frequency);
    
    baseDate.setDate(baseDate.getDate() + offset);
    
    // Create the audit
    const auditId = crypto.randomUUID();
    const scheduledDate = baseDate.toISOString();
    
    return new Promise((resolve, reject) => {
      // First, delete any pending audits for this software
      db.run("DELETE FROM audits WHERE software_id = ? AND completed_date IS NULL", [softwareId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create new audit
        db.run(`INSERT INTO audits (
          id, software_id, scheduled_date, frequency, notes,
          verify_active_users, check_seat_utilization, review_feature_usage, update_department_allocation
        ) VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1)`,
        [auditId, softwareId, scheduledDate, frequency, 'Automatically scheduled audit'],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: auditId,
              softwareId,
              scheduledDate,
              frequency,
              message: `Initial audit scheduled for ${baseDate.toLocaleDateString()}`
            });
          }
        });
      });
    });
  } catch (error) {
    throw new Error(`Failed to schedule initial audit: ${error.message}`);
  }
};

// Schedule next audit after completion
export const scheduleNextAudit = async (completedAuditId, softwareId, frequency) => {
  if (frequency === 'None') {
    return { message: 'No future audits scheduled (frequency is None)' };
  }

  try {
    // Get the completed audit date
    const completedAudit = await new Promise((resolve, reject) => {
      db.get("SELECT completed_date FROM audits WHERE id = ?", [completedAuditId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!completedAudit || !completedAudit.completed_date) {
      throw new Error('Cannot schedule next audit: completed date not found');
    }

    // Calculate next audit date
    const baseDate = calculateNextAuditDate(completedAudit.completed_date, frequency);
    const offset = await getDistributionOffset(frequency);
    
    baseDate.setDate(baseDate.getDate() + offset);
    
    // Create the next audit
    const auditId = crypto.randomUUID();
    const scheduledDate = baseDate.toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO audits (
        id, software_id, scheduled_date, frequency, notes,
        verify_active_users, check_seat_utilization, review_feature_usage, update_department_allocation
      ) VALUES (?, ?, ?, ?, ?, 1, 1, 1, 1)`,
      [auditId, softwareId, scheduledDate, frequency, 'Automatically scheduled follow-up audit'],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: auditId,
            softwareId,
            scheduledDate,
            frequency,
            message: `Next audit scheduled for ${baseDate.toLocaleDateString()}`
          });
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to schedule next audit: ${error.message}`);
  }
};

// Update audit schedules for all software (to be run periodically)
export const updateAllAuditSchedules = async () => {
  try {
    // Get all active software with their audit frequencies
    const softwareList = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, name, audit_frequency
        FROM software 
        WHERE status = 'Active'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const results = [];
    
    for (const software of softwareList) {
      if (!software.audit_frequency || software.audit_frequency === 'None') {
        continue;
      }

      // Check if there's already a pending audit
      const pendingAudit = await new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as count 
          FROM audits 
          WHERE software_id = ? AND completed_date IS NULL
        `, [software.id], (err, row) => {
          if (err) reject(err);
          else resolve(row.count > 0);
        });
      });

      // Only schedule if no pending audit exists
      if (!pendingAudit) {
        try {
          const result = await scheduleInitialAudit(software.id, software.audit_frequency);
          results.push({
            softwareName: software.name,
            ...result
          });
        } catch (error) {
          console.error(`Error scheduling audit for ${software.name}:`, error);
          results.push({
            softwareName: software.name,
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      message: `Processed ${softwareList.length} software entries`,
      results
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update audit schedules: ${error.message}`
    };
  }
};

// Get upcoming audits (for dashboard/reporting)
export const getUpcomingAudits = async (daysAhead = 30) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT a.*, s.name as software_name, s.vendor, s.license_type
      FROM audits a
      JOIN software s ON a.software_id = s.id
      WHERE a.completed_date IS NULL
        AND julianday(a.scheduled_date) <= julianday('now', '+${daysAhead} days')
        AND julianday(a.scheduled_date) >= julianday('now')
      ORDER BY a.scheduled_date ASC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          id: row.id,
          softwareId: row.software_id,
          softwareName: row.software_name,
          vendor: row.vendor,
          licenseType: row.license_type,
          scheduledDate: row.scheduled_date,
          frequency: row.frequency,
          notes: row.notes,
          daysUntilDue: Math.ceil((new Date(row.scheduled_date) - new Date()) / (1000 * 60 * 60 * 24))
        })));
      }
    });
  });
};

// Get overdue audits
export const getOverdueAudits = async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT a.*, s.name as software_name, s.vendor
      FROM audits a
      JOIN software s ON a.software_id = s.id
      WHERE a.completed_date IS NULL
        AND julianday(a.scheduled_date) < julianday('now')
      ORDER BY a.scheduled_date ASC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          id: row.id,
          softwareId: row.software_id,
          softwareName: row.software_name,
          vendor: row.vendor,
          scheduledDate: row.scheduled_date,
          frequency: row.frequency,
          notes: row.notes,
          daysPastDue: Math.ceil((new Date() - new Date(row.scheduled_date)) / (1000 * 60 * 60 * 24))
        })));
      }
    });
  });
};