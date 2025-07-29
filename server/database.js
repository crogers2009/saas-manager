import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'saas_manager.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        department_id TEXT,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        FOREIGN KEY (department_id) REFERENCES departments (id)
      )`);

      // Departments table
      db.run(`CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )`);

      // Feature tags table
      db.run(`CREATE TABLE IF NOT EXISTS feature_tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )`);

      // Software table
      db.run(`CREATE TABLE IF NOT EXISTS software (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vendor TEXT NOT NULL,
        description TEXT,
        owner_id TEXT NOT NULL,
        cost REAL NOT NULL,
        payment_frequency TEXT NOT NULL,
        status TEXT NOT NULL,
        contract_start_date TEXT NOT NULL,
        renewal_date TEXT NOT NULL,
        notice_period TEXT NOT NULL,
        auto_renewal BOOLEAN NOT NULL,
        purchased_by_seat BOOLEAN,
        seats_purchased INTEGER,
        seats_utilized INTEGER,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )`);

      // Software departments (many-to-many)
      db.run(`CREATE TABLE IF NOT EXISTS software_departments (
        software_id TEXT,
        department_id TEXT,
        PRIMARY KEY (software_id, department_id),
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )`);

      // Software feature tags (many-to-many)
      db.run(`CREATE TABLE IF NOT EXISTS software_feature_tags (
        software_id TEXT,
        feature_tag_id TEXT,
        PRIMARY KEY (software_id, feature_tag_id),
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
        FOREIGN KEY (feature_tag_id) REFERENCES feature_tags(id) ON DELETE CASCADE
      )`);

      // Documents table
      db.run(`CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        software_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        file_url TEXT,
        file_path TEXT,
        file_size INTEGER,
        mime_type TEXT,
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
      )`);

      // Integrations table
      db.run(`CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        software_id TEXT NOT NULL,
        linked_software_id TEXT,
        external_integration_name TEXT,
        notes TEXT,
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
        FOREIGN KEY (linked_software_id) REFERENCES software(id) ON DELETE SET NULL
      )`);

      // Software requests table
      db.run(`CREATE TABLE IF NOT EXISTS software_requests (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        requester_id TEXT NOT NULL,
        request_date TEXT NOT NULL,
        status TEXT NOT NULL,
        business_justification TEXT NOT NULL,
        software_name TEXT,
        vendor_name TEXT,
        estimated_cost REAL,
        num_users_needed INTEGER,
        problem_to_solve TEXT,
        current_pain_points TEXT,
        feature_requirements TEXT,
        budget_range TEXT,
        timeline TEXT,
        FOREIGN KEY (requester_id) REFERENCES users(id)
      )`);

      // Audits table
      db.run(`CREATE TABLE IF NOT EXISTS audits (
        id TEXT PRIMARY KEY,
        software_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        completed_date TEXT,
        frequency TEXT NOT NULL,
        notes TEXT,
        verify_active_users BOOLEAN NOT NULL,
        check_seat_utilization BOOLEAN NOT NULL,
        review_feature_usage BOOLEAN NOT NULL,
        update_department_allocation BOOLEAN NOT NULL,
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
      )`);

      // SMTP Configuration table
      db.run(`CREATE TABLE IF NOT EXISTS smtp_config (
        id TEXT PRIMARY KEY,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        secure BOOLEAN NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        from_email TEXT NOT NULL,
        from_name TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 0,
        test_email_sent BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);

      // Notification Preferences table
      db.run(`CREATE TABLE IF NOT EXISTS notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT 1,
        days_before INTEGER,
        email_address TEXT,
        utilization_threshold INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, notification_type)
      )`);

      // Contract History table
      db.run(`CREATE TABLE IF NOT EXISTS contract_history (
        id TEXT PRIMARY KEY,
        software_id TEXT NOT NULL,
        contract_start_date TEXT NOT NULL,
        contract_end_date TEXT NOT NULL,
        cost REAL NOT NULL,
        payment_frequency TEXT NOT NULL,
        notice_period TEXT NOT NULL,
        auto_renewal BOOLEAN NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE
      )`);

      // User departments (many-to-many for department heads)
      db.run(`CREATE TABLE IF NOT EXISTS user_departments (
        user_id TEXT,
        department_id TEXT,
        PRIMARY KEY (user_id, department_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )`);

      // Email Notifications Queue/Log table
      db.run(`CREATE TABLE IF NOT EXISTS email_notifications (
        id TEXT PRIMARY KEY,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        related_entity_id TEXT,
        sent_at TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL
      )`);

      // Cost Centers table
      db.run(`CREATE TABLE IF NOT EXISTS cost_centers (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`, (err) => {
        if (err) {
          reject(err);
        } else {
          // Run migrations
          runMigrations().then(() => {
            console.log('Database tables created successfully');
            resolve();
          }).catch(reject);
        }
      });
    });
  });
};

const runMigrations = () => {
  return new Promise((resolve, reject) => {
    // Check if department_id column exists in users table
    db.all("PRAGMA table_info(users)", (err, userColumns) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasDepartmentId = userColumns.some(col => col.name === 'department_id');
      
      if (!hasDepartmentId) {
        console.log('Adding department_id column to users table...');
        db.run("ALTER TABLE users ADD COLUMN department_id TEXT", (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Migration completed: Added department_id to users table');
          runDocumentsMigration();
        });
      } else {
        console.log('Migration check: department_id column already exists');
        runDocumentsMigration();
      }

      function runDocumentsMigration() {
        // Check if new document columns exist
        db.all("PRAGMA table_info(documents)", (err, docColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasFilePath = docColumns.some(col => col.name === 'file_path');
          const hasFileSize = docColumns.some(col => col.name === 'file_size');
          const hasMimeType = docColumns.some(col => col.name === 'mime_type');
          
          let migrationsNeeded = [];
          
          if (!hasFilePath) {
            migrationsNeeded.push("ALTER TABLE documents ADD COLUMN file_path TEXT");
          }
          if (!hasFileSize) {
            migrationsNeeded.push("ALTER TABLE documents ADD COLUMN file_size INTEGER");
          }
          if (!hasMimeType) {
            migrationsNeeded.push("ALTER TABLE documents ADD COLUMN mime_type TEXT");
          }
          
          if (migrationsNeeded.length > 0) {
            console.log('Adding new columns to documents table...');
            
            db.serialize(() => {
              migrationsNeeded.forEach(sql => {
                db.run(sql, (err) => {
                  if (err) {
                    console.error('Migration error:', err);
                  }
                });
              });
              
              console.log('Migration completed: Added file_path, file_size, and mime_type columns to documents table');
              runLicenseMigration();
            });
          } else {
            console.log('Migration check: documents table columns already exist');
            runLicenseMigration();
          }
        });
      }

      function runLicenseMigration() {
        // Check if new license columns exist in software table
        db.all("PRAGMA table_info(software)", (err, swColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasLicenseType = swColumns.some(col => col.name === 'license_type');
          const hasUsageMetric = swColumns.some(col => col.name === 'usage_metric');
          const hasUsageLimit = swColumns.some(col => col.name === 'usage_limit');
          const hasCurrentUsage = swColumns.some(col => col.name === 'current_usage');
          const hasSitesLicensed = swColumns.some(col => col.name === 'sites_licensed');
          const hasLicenseNotes = swColumns.some(col => col.name === 'license_notes');
          const hasAccountExecutive = swColumns.some(col => col.name === 'account_executive');
          const hasAccountExecutiveEmail = swColumns.some(col => col.name === 'account_executive_email');
          const hasSupportWebsite = swColumns.some(col => col.name === 'support_website');
          const hasSupportEmail = swColumns.some(col => col.name === 'support_email');
          const hasAuditFrequency = swColumns.some(col => col.name === 'audit_frequency');
          const hasContractStartDate = swColumns.some(col => col.name === 'contract_start_date');
          
          let licenseMigrationsNeeded = [];
          
          if (!hasLicenseType) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN license_type TEXT DEFAULT 'Per User/Seat'");
          }
          if (!hasUsageMetric) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN usage_metric TEXT");
          }
          if (!hasUsageLimit) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN usage_limit INTEGER");
          }
          if (!hasCurrentUsage) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN current_usage INTEGER");
          }
          if (!hasSitesLicensed) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN sites_licensed INTEGER");
          }
          if (!hasLicenseNotes) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN license_notes TEXT");
          }
          if (!hasAccountExecutive) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN account_executive TEXT");
          }
          if (!hasAccountExecutiveEmail) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN account_executive_email TEXT");
          }
          if (!hasSupportWebsite) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN support_website TEXT");
          }
          if (!hasSupportEmail) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN support_email TEXT");
          }
          if (!hasAuditFrequency) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN audit_frequency TEXT DEFAULT 'Quarterly'");
          }
          if (!hasContractStartDate) {
            licenseMigrationsNeeded.push("ALTER TABLE software ADD COLUMN contract_start_date TEXT DEFAULT '2024-01-01'");
          }
          
          if (licenseMigrationsNeeded.length > 0) {
            console.log('Adding new license columns to software table...');
            
            db.serialize(() => {
              licenseMigrationsNeeded.forEach(sql => {
                db.run(sql, (err) => {
                  if (err) {
                    console.error('License migration error:', err);
                  }
                });
              });
              
              // Migrate existing data: set license_type based on purchased_by_seat
              db.run(`
                UPDATE software 
                SET license_type = CASE 
                  WHEN purchased_by_seat = 1 THEN 'Per User/Seat'
                  ELSE 'Other'
                END
                WHERE license_type IS NULL
              `, (err) => {
                if (err) {
                  console.error('License data migration error:', err);
                } else {
                  console.log('Migration completed: Added license fields to software table and migrated existing data');
                }
                runAuditMigration();
              });
            });
          } else {
            console.log('Migration check: license columns already exist');
            runAuditMigration();
          }
        });
      }

      function runAuditMigration() {
        // Check if new audit columns exist
        db.all("PRAGMA table_info(audits)", (err, auditColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasCurrentSeatsUsed = auditColumns.some(col => col.name === 'current_seats_used');
          const hasCurrentUsageAmount = auditColumns.some(col => col.name === 'current_usage_amount');
          const hasUsageMetricSnapshot = auditColumns.some(col => col.name === 'usage_metric_snapshot');
          const hasAuditFindings = auditColumns.some(col => col.name === 'audit_findings');
          const hasRecommendedActions = auditColumns.some(col => col.name === 'recommended_actions');
          const hasVerifyActiveUsersCompleted = auditColumns.some(col => col.name === 'verify_active_users_completed');
          const hasCheckSeatUtilizationCompleted = auditColumns.some(col => col.name === 'check_seat_utilization_completed');
          const hasReviewFeatureUsageCompleted = auditColumns.some(col => col.name === 'review_feature_usage_completed');
          const hasUpdateDepartmentAllocationCompleted = auditColumns.some(col => col.name === 'update_department_allocation_completed');
          
          let auditMigrationsNeeded = [];
          
          if (!hasCurrentSeatsUsed) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN current_seats_used INTEGER");
          }
          if (!hasCurrentUsageAmount) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN current_usage_amount INTEGER");
          }
          if (!hasUsageMetricSnapshot) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN usage_metric_snapshot TEXT");
          }
          if (!hasAuditFindings) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN audit_findings TEXT");
          }
          if (!hasRecommendedActions) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN recommended_actions TEXT");
          }
          if (!hasVerifyActiveUsersCompleted) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN verify_active_users_completed BOOLEAN DEFAULT 0");
          }
          if (!hasCheckSeatUtilizationCompleted) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN check_seat_utilization_completed BOOLEAN DEFAULT 0");
          }
          if (!hasReviewFeatureUsageCompleted) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN review_feature_usage_completed BOOLEAN DEFAULT 0");
          }
          if (!hasUpdateDepartmentAllocationCompleted) {
            auditMigrationsNeeded.push("ALTER TABLE audits ADD COLUMN update_department_allocation_completed BOOLEAN DEFAULT 0");
          }
          
          if (auditMigrationsNeeded.length > 0) {
            console.log('Adding new audit columns to audits table...');
            
            db.serialize(() => {
              auditMigrationsNeeded.forEach(sql => {
                db.run(sql, (err) => {
                  if (err) {
                    console.error('Audit migration error:', err);
                  }
                });
              });
              
              console.log('Migration completed: Added audit tracking fields to audits table');
              runPasswordMigration();
            });
          } else {
            console.log('Migration check: audit columns already exist');
            runPasswordMigration();
          }
        });
      }

      function runPasswordMigration() {
        // Check if must_change_password column exists in users table
        db.all("PRAGMA table_info(users)", (err, userColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasMustChangePassword = userColumns.some(col => col.name === 'must_change_password');
          
          if (!hasMustChangePassword) {
            console.log('Adding must_change_password column to users table...');
            db.run("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0", (err) => {
              if (err) {
                console.error('Password migration error:', err);
                reject(err);
                return;
              }
              console.log('Migration completed: Added must_change_password to users table');
              runUserDepartmentsMigration();
            });
          } else {
            console.log('Migration check: must_change_password column already exists');
            runUserDepartmentsMigration();
          }
        });
      }

      function runUserDepartmentsMigration() {
        // Check if we need to migrate data from users.department_id to user_departments table
        db.get("SELECT COUNT(*) as count FROM user_departments", (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          
          // If the table is empty, migrate existing department_id data
          if (result.count === 0) {
            console.log('Migrating user department data to user_departments table...');
            
            db.all("SELECT id, department_id FROM users WHERE department_id IS NOT NULL AND department_id != ''", (err, users) => {
              if (err) {
                console.error('User departments migration error:', err);
                reject(err);
                return;
              }
              
              if (users.length > 0) {
                const stmt = db.prepare("INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)");
                
                users.forEach(user => {
                  stmt.run(user.id, user.department_id);
                });
                
                stmt.finalize((err) => {
                  if (err) {
                    console.error('User departments migration error:', err);
                    reject(err);
                    return;
                  }
                  console.log(`Migration completed: Migrated ${users.length} user department relationships`);
                  runContractEndDateMigration();
                });
              } else {
                console.log('Migration check: No user department data to migrate');
                runContractEndDateMigration();
              }
            });
          } else {
            console.log('Migration check: user_departments table already populated');
            runContractEndDateMigration();
          }
        });
      }

      function runContractEndDateMigration() {
        // Check if contract_end_date column exists and remove it since we use renewal_date now
        db.all("PRAGMA table_info(software)", (err, columns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasContractEndDate = columns.some(col => col.name === 'contract_end_date');
          
          if (hasContractEndDate) {
            console.log('Removing deprecated contract_end_date column from software table...');
            
            // SQLite doesn't support DROP COLUMN, so we need to recreate the table
            db.serialize(() => {
              // Create temporary table with new structure
              db.run(`CREATE TABLE software_new (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                vendor TEXT NOT NULL,
                description TEXT,
                owner_id TEXT NOT NULL,
                cost REAL NOT NULL,
                payment_frequency TEXT NOT NULL,
                status TEXT NOT NULL,
                contract_start_date TEXT NOT NULL,
                renewal_date TEXT NOT NULL,
                notice_period TEXT NOT NULL,
                auto_renewal BOOLEAN NOT NULL,
                license_type TEXT DEFAULT 'Per User/Seat',
                seats_purchased INTEGER,
                seats_utilized INTEGER,
                usage_metric TEXT,
                usage_limit INTEGER,
                current_usage INTEGER,
                sites_licensed INTEGER,
                license_notes TEXT,
                account_executive TEXT,
                account_executive_email TEXT,
                support_website TEXT,
                support_email TEXT,
                audit_frequency TEXT DEFAULT 'Quarterly',
                FOREIGN KEY (owner_id) REFERENCES users(id)
              )`);
              
              // Copy data from old table to new table
              db.run(`INSERT INTO software_new SELECT 
                id, name, vendor, description, owner_id, cost, payment_frequency, status,
                contract_start_date, renewal_date, notice_period, auto_renewal, license_type,
                seats_purchased, seats_utilized, usage_metric, usage_limit, current_usage,
                sites_licensed, license_notes, account_executive, account_executive_email,
                support_website, support_email, audit_frequency
                FROM software`);
              
              // Drop old table and rename new table
              db.run("DROP TABLE software");
              db.run("ALTER TABLE software_new RENAME TO software");
              
              console.log('Migration completed: Removed contract_end_date column from software table');
              runCostCenterMigration();
            });
          } else {
            console.log('Migration check: contract_end_date column already removed');
            runCostCenterMigration();
          }
        });
      }

      function runCostCenterMigration() {
        // Check if cost_center_code column exists in software table
        db.all("PRAGMA table_info(software)", (err, columns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasCostCenterCode = columns.some(col => col.name === 'cost_center_code');
          
          if (!hasCostCenterCode) {
            console.log('Adding cost_center_code column to software table...');
            db.run("ALTER TABLE software ADD COLUMN cost_center_code TEXT", (err) => {
              if (err) {
                console.error('Cost center migration error:', err);
                reject(err);
                return;
              }
              console.log('Migration completed: Added cost_center_code column to software table');
              resolve();
            });
          } else {
            console.log('Migration check: cost_center_code column already exists');
            resolve();
          }
        });
      }
    });
  });
};

export const seedDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Check if data already exists
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log('Database already seeded');
        resolve();
        return;
      }

      try {
        // Pre-hash passwords
        const adminHash = await bcrypt.hash('admin123', 10);
        const userHash = await bcrypt.hash('password123', 10);
        const createdAt = new Date().toISOString();

        // Insert users with hashed passwords
        const users = [
          { id: 'user-1', name: 'Alice Johnson', email: 'admin@company.com', role: 'Administrator', departmentId: null, passwordHash: adminHash },
          { id: 'user-2', name: 'Bob Smith', email: 'bob@company.com', role: 'Software Owner', departmentId: null, passwordHash: userHash },
          { id: 'user-3', name: 'Carol Davis', email: 'carol@company.com', role: 'Department Head', departmentId: 'dept-1', passwordHash: userHash }
        ];

        const userStmt = db.prepare("INSERT INTO users (id, name, email, role, department_id, password_hash, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        users.forEach(user => {
          userStmt.run(user.id, user.name, user.email, user.role, user.departmentId, user.passwordHash, createdAt, 1);
        });
        userStmt.finalize();

        // Insert departments
        const departments = [
          { id: 'dept-1', name: 'Engineering' },
          { id: 'dept-2', name: 'Marketing' },
          { id: 'dept-3', name: 'Sales' },
          { id: 'dept-4', name: 'HR' }
        ];

        const deptStmt = db.prepare("INSERT INTO departments (id, name) VALUES (?, ?)");
        departments.forEach(dept => {
          deptStmt.run(dept.id, dept.name);
        });
        deptStmt.finalize();

        // Insert cost centers
        const costCenters = [
          { id: 'cc-1', code: 'ENG001', name: 'Engineering Department', description: 'Software development and infrastructure' },
          { id: 'cc-2', code: 'MKT001', name: 'Marketing Department', description: 'Marketing and advertising operations' },
          { id: 'cc-3', code: 'SAL001', name: 'Sales Department', description: 'Sales and customer acquisition' },
          { id: 'cc-4', code: 'HRD001', name: 'Human Resources', description: 'HR and employee management' },
          { id: 'cc-5', code: 'OPS001', name: 'Operations', description: 'General business operations' },
          { id: 'cc-6', code: 'FIN001', name: 'Finance', description: 'Accounting and financial operations' }
        ];

        const ccStmt = db.prepare("INSERT INTO cost_centers (id, code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        costCenters.forEach(cc => {
          ccStmt.run(cc.id, cc.code, cc.name, cc.description, 1, createdAt, createdAt);
        });
        ccStmt.finalize();

        // Insert feature tags
        const featureTags = [
          { id: 'tag-1', name: 'Communication' },
          { id: 'tag-2', name: 'Project Management' },
          { id: 'tag-3', name: 'Analytics' },
          { id: 'tag-4', name: 'Design' }
        ];

        const tagStmt = db.prepare("INSERT INTO feature_tags (id, name) VALUES (?, ?)");
        featureTags.forEach(tag => {
          tagStmt.run(tag.id, tag.name);
        });
        tagStmt.finalize();

        // Insert sample software
        const software = [
          {
            id: 'sw-1',
            name: 'Slack',
            vendor: 'Slack Technologies',
            description: 'Team communication platform',
            owner_id: 'user-1',
            cost: 8.0,
            payment_frequency: 'Monthly',
            status: 'Active',
            renewal_date: '2025-12-01',
            notice_period: '30 Days',
            auto_renewal: true,
            contract_end_date: '2025-12-01',
            purchased_by_seat: true,
            seats_purchased: 50,
            seats_utilized: 45
          }
        ];

        const swStmt = db.prepare(`INSERT INTO software (
          id, name, vendor, description, owner_id, cost, payment_frequency, 
          status, renewal_date, notice_period, auto_renewal, contract_end_date,
          purchased_by_seat, seats_purchased, seats_utilized
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        software.forEach(sw => {
          swStmt.run(
            sw.id, sw.name, sw.vendor, sw.description, sw.owner_id, sw.cost,
            sw.payment_frequency, sw.status, sw.renewal_date, sw.notice_period,
            sw.auto_renewal, sw.contract_end_date, sw.purchased_by_seat,
            sw.seats_purchased, sw.seats_utilized
          );
        });
        swStmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database seeded successfully');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
};