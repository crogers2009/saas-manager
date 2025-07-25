import express from 'express';
import { db } from '../database.js';
import crypto from 'crypto';
import { authenticateUser, createSoftwareFilter } from '../middleware/auth.js';
import { scheduleInitialAudit } from '../services/auditSchedulingService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Helper function to get department name by software ID
const getDepartmentNameBySoftware = (softwareId, callback) => {
  const query = `
    SELECT d.name 
    FROM departments d
    JOIN software_departments sd ON d.id = sd.department_id
    WHERE sd.software_id = ?
    LIMIT 1
  `;
  
  db.get(query, [softwareId], (err, row) => {
    if (err) {
      callback(err, null);
      return;
    }
    // Default to 'General' if no department found
    callback(null, row ? row.name : 'General');
  });
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const softwareId = req.params.id;
    
    getDepartmentNameBySoftware(softwareId, (err, departmentName) => {
      if (err) {
        cb(err);
        return;
      }
      
      const deptDir = path.join(uploadsDir, 'departments', departmentName);
      
      // Ensure directory exists
      if (!fs.existsSync(deptDir)) {
        fs.mkdirSync(deptDir, { recursive: true });
      }
      
      cb(null, deptDir);
    });
  },
  filename: (req, file, cb) => {
    // Get software name and document type from request body
    const softwareName = req.body.softwareName || 'unknown-software';
    const documentType = req.body.type || 'document';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    
    // Clean software name for filename
    const cleanSoftwareName = softwareName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const cleanDocumentType = documentType.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    const filename = `${cleanSoftwareName}_${cleanDocumentType}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to get software with related data
const getSoftwareWithRelations = (softwareId, callback) => {
  const software = {};
  
  // Get software details
  db.get("SELECT * FROM software WHERE id = ?", [softwareId], (err, row) => {
    if (err || !row) {
      callback(err || new Error('Software not found'), null);
      return;
    }
    
    Object.assign(software, row);
    
    // Get departments
    db.all(`
      SELECT d.id, d.name 
      FROM departments d
      JOIN software_departments sd ON d.id = sd.department_id
      WHERE sd.software_id = ?
    `, [softwareId], (err, deptRows) => {
      if (err) {
        callback(err, null);
        return;
      }
      software.departmentIds = deptRows.map(d => d.id);
      
      // Get feature tags
      db.all(`
        SELECT ft.id, ft.name
        FROM feature_tags ft
        JOIN software_feature_tags sft ON ft.id = sft.feature_tag_id
        WHERE sft.software_id = ?
      `, [softwareId], (err, tagRows) => {
        if (err) {
          callback(err, null);
          return;
        }
        software.featureTagIds = tagRows.map(t => t.id);
        
        // Get documents
        db.all("SELECT * FROM documents WHERE software_id = ?", [softwareId], (err, docRows) => {
          if (err) {
            callback(err, null);
            return;
          }
          software.documents = docRows.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            uploadDate: doc.upload_date,
            fileUrl: doc.file_url,
            filePath: doc.file_path,
            fileSize: doc.file_size,
            mimeType: doc.mime_type
          }));
          
          // Get integrations
          db.all("SELECT * FROM integrations WHERE software_id = ?", [softwareId], (err, intRows) => {
            if (err) {
              callback(err, null);
              return;
            }
            software.integrations = intRows.map(int => ({
              id: int.id,
              linkedSoftwareId: int.linked_software_id,
              externalIntegrationName: int.external_integration_name,
              notes: int.notes
            }));
            
            // Transform database fields to match frontend expectations
            const transformedSoftware = {
              id: software.id,
              name: software.name,
              vendor: software.vendor,
              description: software.description,
              ownerId: software.owner_id,
              departmentIds: software.departmentIds,
              cost: software.cost,
              paymentFrequency: software.payment_frequency,
              status: software.status,
              featureTagIds: software.featureTagIds,
              renewalDate: software.renewal_date,
              noticePeriod: software.notice_period,
              autoRenewal: Boolean(software.auto_renewal),
              contractStartDate: software.contract_start_date,
              integrations: software.integrations,
              documents: software.documents,
              licenseType: software.license_type || 'Per User/Seat',
              seatsPurchased: software.seats_purchased,
              seatsUtilized: software.seats_utilized,
              usageMetric: software.usage_metric,
              usageLimit: software.usage_limit,
              currentUsage: software.current_usage,
              sitesLicensed: software.sites_licensed,
              licenseNotes: software.license_notes,
              accountExecutive: software.account_executive,
              accountExecutiveEmail: software.account_executive_email,
              supportWebsite: software.support_website,
              supportEmail: software.support_email,
              auditFrequency: software.audit_frequency
            };
            
            callback(null, transformedSoftware);
          });
        });
      });
    });
  });
};

// Get all software (with role-based filtering)
router.get('/', authenticateUser, (req, res) => {
  const filter = createSoftwareFilter(req.user);
  const query = `SELECT * FROM software s ${filter.whereClause}`;
  
  db.all(query, filter.params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Get all software with relations
    const promises = rows.map(row => {
      return new Promise((resolve, reject) => {
        getSoftwareWithRelations(row.id, (err, software) => {
          if (err) reject(err);
          else resolve(software);
        });
      });
    });
    
    Promise.all(promises)
      .then(software => res.json(software))
      .catch(err => res.status(500).json({ error: err.message }));
  });
});

// Get software by ID (with role-based access control)
router.get('/:id', authenticateUser, (req, res) => {
  const { id } = req.params;
  const filter = createSoftwareFilter(req.user);
  
  let query;
  let params;
  
  if (filter.whereClause) {
    // If there's already a WHERE clause, add AND
    query = `SELECT * FROM software s ${filter.whereClause} AND s.id = ?`;
    params = [...filter.params, id];
  } else {
    // If no WHERE clause (admin case), start with WHERE
    query = `SELECT * FROM software s WHERE s.id = ?`;
    params = [id];
  }
  
  db.get(query, params, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Software not found or access denied' });
      return;
    }
    
    getSoftwareWithRelations(id, (err, software) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(software);
    });
  });
});

// Create new software (admin only)
router.post('/', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can create software' });
  }
  const {
    name, vendor, description, ownerId, departmentIds = [], cost,
    paymentFrequency, status, featureTagIds = [], renewalDate,
    noticePeriod, autoRenewal, contractStartDate, licenseType,
    seatsPurchased, seatsUtilized, usageMetric, usageLimit,
    currentUsage, sitesLicensed, licenseNotes, accountExecutive,
    accountExecutiveEmail, supportWebsite, supportEmail, auditFrequency
  } = req.body;
  
  const id = crypto.randomUUID();
  
  db.serialize(() => {
    db.run(`INSERT INTO software (
      id, name, vendor, description, owner_id, cost, payment_frequency,
      status, contract_start_date, renewal_date, notice_period, auto_renewal,
      license_type, seats_purchased, seats_utilized, usage_metric, usage_limit,
      current_usage, sites_licensed, license_notes, account_executive,
      account_executive_email, support_website, support_email, audit_frequency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, name, vendor, description, ownerId, cost, paymentFrequency, status,
     contractStartDate, renewalDate, noticePeriod, autoRenewal, licenseType,
     seatsPurchased, seatsUtilized, usageMetric, usageLimit, currentUsage,
     sitesLicensed, licenseNotes, accountExecutive, accountExecutiveEmail,
     supportWebsite, supportEmail, auditFrequency], async (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Insert department relations
      const deptStmt = db.prepare("INSERT INTO software_departments (software_id, department_id) VALUES (?, ?)");
      departmentIds.forEach(deptId => {
        deptStmt.run(id, deptId);
      });
      deptStmt.finalize();
      
      // Insert feature tag relations
      const tagStmt = db.prepare("INSERT INTO software_feature_tags (software_id, feature_tag_id) VALUES (?, ?)");
      featureTagIds.forEach(tagId => {
        tagStmt.run(id, tagId);
      });
      tagStmt.finalize();
      
      // Schedule initial audit if frequency is set
      if (auditFrequency && auditFrequency !== 'None') {
        try {
          await scheduleInitialAudit(id, auditFrequency);
          console.log(`Initial audit scheduled for software: ${name}`);
        } catch (auditError) {
          console.error('Error scheduling initial audit:', auditError);
          // Don't fail the entire request if audit scheduling fails
        }
      }
      
      getSoftwareWithRelations(id, (err, software) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json(software);
      });
    });
  });
});

// Update software (admin only)
router.put('/:id', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can update software' });
  }
  const { id } = req.params;
  const updates = req.body;
  
  // Build dynamic update query
  const fields = [];
  const values = [];
  
  const fieldMap = {
    name: 'name',
    vendor: 'vendor', 
    description: 'description',
    ownerId: 'owner_id',
    cost: 'cost',
    paymentFrequency: 'payment_frequency',
    status: 'status',
    renewalDate: 'renewal_date',
    noticePeriod: 'notice_period',
    autoRenewal: 'auto_renewal',
    contractStartDate: 'contract_start_date',
    licenseType: 'license_type',
    seatsPurchased: 'seats_purchased',
    seatsUtilized: 'seats_utilized',
    usageMetric: 'usage_metric',
    usageLimit: 'usage_limit',
    currentUsage: 'current_usage',
    sitesLicensed: 'sites_licensed',
    licenseNotes: 'license_notes',
    accountExecutive: 'account_executive',
    accountExecutiveEmail: 'account_executive_email',
    supportWebsite: 'support_website',
    supportEmail: 'support_email',
    auditFrequency: 'audit_frequency'
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
  
  db.serialize(() => {
    db.run(`UPDATE software SET ${fields.join(', ')} WHERE id = ?`, values, async (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Update department relations if provided
      if (updates.departmentIds) {
        db.run("DELETE FROM software_departments WHERE software_id = ?", [id], (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const deptStmt = db.prepare("INSERT INTO software_departments (software_id, department_id) VALUES (?, ?)");
          updates.departmentIds.forEach(deptId => {
            deptStmt.run(id, deptId);
          });
          deptStmt.finalize();
        });
      }
      
      // Update feature tag relations if provided
      if (updates.featureTagIds) {
        db.run("DELETE FROM software_feature_tags WHERE software_id = ?", [id], (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const tagStmt = db.prepare("INSERT INTO software_feature_tags (software_id, feature_tag_id) VALUES (?, ?)");
          updates.featureTagIds.forEach(tagId => {
            tagStmt.run(id, tagId);
          });
          tagStmt.finalize();
        });
      }
      
      // Handle audit frequency changes
      if (updates.auditFrequency !== undefined) {
        try {
          await scheduleInitialAudit(id, updates.auditFrequency);
          console.log(`Audit schedule updated for software ID: ${id}`);
        } catch (auditError) {
          console.error('Error updating audit schedule:', auditError);
          // Don't fail the entire request if audit scheduling fails
        }
      }
      
      getSoftwareWithRelations(id, (err, software) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(software);
      });
    });
  });
});

// Delete software (admin only)
router.delete('/:id', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can delete software' });
  }
  const { id } = req.params;
  
  db.run("DELETE FROM software WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Software not found' });
      return;
    }
    res.json({ message: 'Software deleted successfully' });
  });
});

// Upload document to software (admin only)
router.post('/:id/documents', authenticateUser, upload.single('file'), (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can add documents' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const { id } = req.params;
  const { name, type } = req.body;
  
  // Validate required fields
  if (!name || !type) {
    // Clean up uploaded file if validation fails
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Document name and type are required' });
  }
  
  const documentId = crypto.randomUUID();
  const uploadDate = new Date().toISOString();
  
  // Get software name for better file organization
  db.get("SELECT name FROM software WHERE id = ?", [id], (err, software) => {
    if (err) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: err.message });
    }
    
    if (!software) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Software not found' });
    }
    
    // Store document metadata in database
    const insertQuery = `
      INSERT INTO documents (
        id, software_id, name, type, upload_date, file_url, 
        file_path, file_size, mime_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const fileUrl = `/uploads/departments/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;
    
    db.run(insertQuery, [
      documentId, 
      id, 
      req.file.filename, // Use generated filename instead of user-provided name
      type, 
      uploadDate, 
      fileUrl,
      req.file.path,
      req.file.size,
      req.file.mimetype
    ], (err) => {
      if (err) {
        // Clean up file if database insert fails
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
        return;
      }
      
      getSoftwareWithRelations(id, (err, software) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json(software);
      });
    });
  });
});

// Delete document from software (admin only)
router.delete('/:id/documents/:docId', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can delete documents' });
  }
  const { id, docId } = req.params;
  
  // First get the document to find the file path
  db.get("SELECT file_path FROM documents WHERE id = ? AND software_id = ?", [docId, id], (err, doc) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Delete the document from database
    db.run("DELETE FROM documents WHERE id = ? AND software_id = ?", [docId, id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Delete the actual file if it exists and we have a file path
      if (doc && doc.file_path && fs.existsSync(doc.file_path)) {
        try {
          fs.unlinkSync(doc.file_path);
        } catch (fileErr) {
          console.error('Error deleting file:', fileErr);
          // Continue even if file deletion fails
        }
      }
      
      getSoftwareWithRelations(id, (err, software) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(software);
      });
    });
  });
});

// Add integration to software (admin only)
router.post('/:id/integrations', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can add integrations' });
  }
  const { id } = req.params;
  const { linkedSoftwareId, externalIntegrationName, notes } = req.body;
  
  const integrationId = crypto.randomUUID();
  
  db.run("INSERT INTO integrations (id, software_id, linked_software_id, external_integration_name, notes) VALUES (?, ?, ?, ?, ?)",
    [integrationId, id, linkedSoftwareId, externalIntegrationName, notes], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    getSoftwareWithRelations(id, (err, software) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json(software);
    });
  });
});

// Delete integration from software (admin only)
router.delete('/:id/integrations/:intId', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can delete integrations' });
  }
  const { id, intId } = req.params;
  
  db.run("DELETE FROM integrations WHERE id = ? AND software_id = ?", [intId, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    getSoftwareWithRelations(id, (err, software) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(software);
    });
  });
});

export default router;