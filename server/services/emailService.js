import nodemailer from 'nodemailer';
import { db } from '../database.js';
import crypto from 'crypto';

// Encryption key for decrypting SMTP passwords
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';

const decrypt = (encryptedText) => {
  try {
    // For demo purposes, using base64 decoding (in production, use proper decryption)
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText;
  }
};

// Get active SMTP configuration
const getSMTPConfig = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1", (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('No active SMTP configuration found'));
      } else {
        resolve({
          host: row.host,
          port: row.port,
          secure: Boolean(row.secure),
          username: row.username,
          password: decrypt(row.password),
          fromEmail: row.from_email,
          fromName: row.from_name
        });
      }
    });
  });
};

// Create email transporter
const createTransporter = async () => {
  const config = await getSMTPConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });
};

// Log email notification
const logEmailNotification = (recipientEmail, recipientName, subject, body, notificationType, relatedEntityId = null, status = 'pending', errorMessage = null) => {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sentAt = status === 'sent' ? createdAt : null;

  db.run(`INSERT INTO email_notifications (
    id, recipient_email, recipient_name, subject, body, notification_type, 
    related_entity_id, sent_at, status, error_message, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, recipientEmail, recipientName, subject, body, notificationType, relatedEntityId, sentAt, status, errorMessage, createdAt],
  (err) => {
    if (err) {
      console.error('Error logging email notification:', err);
    }
  });

  return id;
};

// Send email notification
export const sendEmailNotification = async (recipientEmail, recipientName, subject, body, notificationType, relatedEntityId = null) => {
  let logId;
  try {
    // Log the notification attempt
    logId = logEmailNotification(recipientEmail, recipientName, subject, body, notificationType, relatedEntityId, 'pending');

    // Create transporter and send email
    const transporter = await createTransporter();
    const config = await getSMTPConfig();

    await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: `${recipientName} <${recipientEmail}>`,
      subject,
      html: body,
    });

    // Update log as sent
    db.run("UPDATE email_notifications SET status = 'sent', sent_at = ? WHERE id = ?", 
      [new Date().toISOString(), logId]);

    console.log(`Email sent successfully to ${recipientEmail}: ${subject}`);
    return { success: true, message: 'Email sent successfully' };

  } catch (error) {
    console.error('Email sending error:', error);
    
    // Update log with error
    if (logId) {
      db.run("UPDATE email_notifications SET status = 'failed', error_message = ? WHERE id = ?", 
        [error.message, logId]);
    }

    return { success: false, message: error.message };
  }
};

// Get users who should receive notifications based on their role and software
const getNotificationRecipients = async (software, notificationType) => {
  return new Promise((resolve, reject) => {
    let query;
    let params;

    if (notificationType === 'Audit Due') {
      // Only administrators get audit notifications
      query = `
        SELECT u.id, u.name, u.email, u.role, np.is_enabled, np.email_address
        FROM users u
        LEFT JOIN notification_preferences np ON u.id = np.user_id AND np.notification_type = ?
        WHERE u.role = 'Administrator' AND u.is_active = 1
      `;
      params = [notificationType];
    } else {
      // Role-based software notifications
      query = `
        SELECT DISTINCT u.id, u.name, u.email, u.role, np.is_enabled, np.email_address
        FROM users u
        LEFT JOIN notification_preferences np ON u.id = np.user_id AND np.notification_type = ?
        LEFT JOIN software_departments sd ON sd.software_id = ?
        WHERE u.is_active = 1 AND (
          u.role = 'Administrator' OR
          u.id = ? OR
          (u.role = 'Department Head' AND u.department_id IN (
            SELECT department_id FROM software_departments WHERE software_id = ?
          ))
        )
      `;
      params = [notificationType, software.id, software.owner_id, software.id];
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Filter to only include users with notifications enabled (default to enabled if no preference set)
        const recipients = rows.filter(row => row.is_enabled !== 0);
        resolve(recipients);
      }
    });
  });
};

// Generate renewal reminder email HTML
const generateRenewalReminderEmail = (software, user, daysUntilRenewal) => {
  const subject = `Renewal Reminder: ${software.name} - ${daysUntilRenewal} days remaining`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Software Renewal Reminder</h2>
      
      <p>Hello ${user.name},</p>
      
      <p>This is a reminder that the following software is due for renewal in <strong>${daysUntilRenewal} days</strong>:</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">${software.name}</h3>
        <p><strong>Vendor:</strong> ${software.vendor}</p>
        <p><strong>Renewal Date:</strong> ${new Date(software.renewal_date).toLocaleDateString()}</p>
        <p><strong>Cost:</strong> $${software.cost.toLocaleString()} / ${software.payment_frequency}</p>
        <p><strong>License Type:</strong> ${software.license_type}</p>
        ${software.notice_period !== 'None' ? `<p><strong>Notice Period:</strong> ${software.notice_period}</p>` : ''}
        ${software.auto_renewal ? '<p style="color: #059669;"><strong>Auto-renewal is enabled</strong></p>' : '<p style="color: #dc2626;"><strong>Auto-renewal is NOT enabled</strong></p>'}
      </div>
      
      ${software.account_executive ? `
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1e40af;">Account Executive Contact</h4>
          <p><strong>${software.account_executive}</strong></p>
          ${software.account_executive_email ? `<p>Email: <a href="mailto:${software.account_executive_email}">${software.account_executive_email}</a></p>` : ''}
        </div>
      ` : ''}
      
      <p>Please take the necessary action to ensure continuity of service.</p>
      
      <p>Best regards,<br>SaaS Manager System</p>
    </div>
  `;
  
  return { subject, body };
};

// Generate audit reminder email HTML
const generateAuditReminderEmail = (audit, software, user, daysUntilDue) => {
  const subject = `Audit Due: ${software.name} - ${daysUntilDue} days remaining`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Software Audit Reminder</h2>
      
      <p>Hello ${user.name},</p>
      
      <p>This is a reminder that a software audit is due in <strong>${daysUntilDue} days</strong>:</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin-top: 0; color: #1f2937;">${software.name}</h3>
        <p><strong>Vendor:</strong> ${software.vendor}</p>
        <p><strong>Audit Scheduled:</strong> ${new Date(audit.scheduled_date).toLocaleDateString()}</p>
        <p><strong>Frequency:</strong> ${audit.frequency}</p>
        ${audit.notes ? `<p><strong>Notes:</strong> ${audit.notes}</p>` : ''}
      </div>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #374151;">Audit Checklist</h4>
        <ul>
          ${audit.verify_active_users ? '<li>✓ Verify active users</li>' : '<li style="color: #6b7280;">○ Verify active users</li>'}
          ${audit.check_seat_utilization ? '<li>✓ Check seat utilization</li>' : '<li style="color: #6b7280;">○ Check seat utilization</li>'}
          ${audit.review_feature_usage ? '<li>✓ Review feature usage</li>' : '<li style="color: #6b7280;">○ Review feature usage</li>'}
          ${audit.update_department_allocation ? '<li>✓ Update department allocation</li>' : '<li style="color: #6b7280;">○ Update department allocation</li>'}
        </ul>
      </div>
      
      <p>Please complete the audit by the scheduled date to maintain compliance.</p>
      
      <p>Best regards,<br>SaaS Manager System</p>
    </div>
  `;
  
  return { subject, body };
};

// Send renewal reminders
export const sendRenewalReminders = async () => {
  try {
    // Get all software with upcoming renewals that have notification preferences
    const query = `
      SELECT s.*, 
             GROUP_CONCAT(DISTINCT np.user_id) as notified_users,
             MIN(np.days_before) as min_days_before
      FROM software s
      LEFT JOIN users u ON u.is_active = 1
      LEFT JOIN notification_preferences np ON np.user_id = u.id 
        AND np.notification_type = 'Renewal Reminder' 
        AND np.is_enabled = 1
      WHERE s.status = 'Active'
        AND julianday(s.renewal_date) - julianday('now') <= (
          SELECT COALESCE(MAX(days_before), 30) 
          FROM notification_preferences 
          WHERE notification_type = 'Renewal Reminder' AND is_enabled = 1
        )
        AND julianday(s.renewal_date) - julianday('now') > 0
      GROUP BY s.id
      HAVING notified_users IS NOT NULL
    `;

    const softwareList = await new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let sentCount = 0;
    
    for (const software of softwareList) {
      const daysUntilRenewal = Math.ceil(
        (new Date(software.renewal_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Get recipients for this software
      const recipients = await getNotificationRecipients(software, 'Renewal Reminder');
      
      for (const recipient of recipients) {
        // Check if this user wants to be notified this many days before
        const userDaysBefore = recipient.days_before || 30;
        
        if (daysUntilRenewal <= userDaysBefore) {
          const email = generateRenewalReminderEmail(software, recipient, daysUntilRenewal);
          const recipientEmail = recipient.email_address || recipient.email;
          
          await sendEmailNotification(
            recipientEmail,
            recipient.name,
            email.subject,
            email.body,
            'Renewal Reminder',
            software.id
          );
          
          sentCount++;
        }
      }
    }

    console.log(`Sent ${sentCount} renewal reminder emails`);
    return { success: true, message: `Sent ${sentCount} renewal reminders` };

  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    return { success: false, message: error.message };
  }
};

// Send audit reminders
export const sendAuditReminders = async () => {
  try {
    // Get all upcoming audits
    const query = `
      SELECT a.*, s.name as software_name, s.vendor, s.id as software_id
      FROM audits a
      JOIN software s ON a.software_id = s.id
      WHERE a.completed_date IS NULL
        AND julianday(a.scheduled_date) - julianday('now') <= (
          SELECT COALESCE(MAX(days_before), 7) 
          FROM notification_preferences 
          WHERE notification_type = 'Audit Due' AND is_enabled = 1
        )
        AND julianday(a.scheduled_date) - julianday('now') > 0
    `;

    const audits = await new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let sentCount = 0;
    
    for (const audit of audits) {
      const daysUntilDue = Math.ceil(
        (new Date(audit.scheduled_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Get admin recipients (only admins get audit notifications)
      const recipients = await getNotificationRecipients({ id: audit.software_id }, 'Audit Due');
      
      for (const recipient of recipients) {
        const userDaysBefore = recipient.days_before || 7;
        
        if (daysUntilDue <= userDaysBefore) {
          const software = { 
            name: audit.software_name, 
            vendor: audit.vendor,
            id: audit.software_id 
          };
          
          const email = generateAuditReminderEmail(audit, software, recipient, daysUntilDue);
          const recipientEmail = recipient.email_address || recipient.email;
          
          await sendEmailNotification(
            recipientEmail,
            recipient.name,
            email.subject,
            email.body,
            'Audit Due',
            audit.id
          );
          
          sentCount++;
        }
      }
    }

    console.log(`Sent ${sentCount} audit reminder emails`);
    return { success: true, message: `Sent ${sentCount} audit reminders` };

  } catch (error) {
    console.error('Error sending audit reminders:', error);
    return { success: false, message: error.message };
  }
};

// Generate utilization warning email HTML
const generateUtilizationWarningEmail = (software, user, utilizationPercentage, threshold) => {
  const subject = `Utilization Alert: ${software.name} - ${utilizationPercentage}% utilized`;
  
  const thresholdClass = threshold >= 90 ? 'red' : threshold >= 75 ? 'orange' : 'yellow';
  const thresholdColor = threshold >= 90 ? '#dc2626' : threshold >= 75 ? '#ea580c' : '#d97706';
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${thresholdColor};">Software Utilization Alert</h2>
      
      <p>Hello ${user.name},</p>
      
      <p>The following software has reached <strong>${utilizationPercentage}%</strong> utilization, exceeding your ${threshold}% threshold:</p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${thresholdColor};">
        <h3 style="margin-top: 0; color: #1f2937;">${software.name}</h3>
        <p><strong>Vendor:</strong> ${software.vendor}</p>
        <p><strong>License Type:</strong> ${software.license_type}</p>
        ${software.license_type === 'Per User/Seat' ? `
          <p><strong>Seats Used:</strong> ${software.seats_utilized} / ${software.seats_purchased}</p>
          <p><strong>Utilization:</strong> ${utilizationPercentage}%</p>
        ` : software.license_type === 'Usage-Based' ? `
          <p><strong>Current Usage:</strong> ${software.current_usage?.toLocaleString()} ${software.usage_metric}</p>
          <p><strong>Usage Limit:</strong> ${software.usage_limit?.toLocaleString()} ${software.usage_metric}</p>
          <p><strong>Utilization:</strong> ${utilizationPercentage}%</p>
        ` : ''}
        <p><strong>Cost:</strong> $${software.cost.toLocaleString()} / ${software.payment_frequency}</p>
      </div>
      
      ${software.account_executive ? `
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1e40af;">Account Executive Contact</h4>
          <p><strong>${software.account_executive}</strong></p>
          ${software.account_executive_email ? `<p>Email: <a href="mailto:${software.account_executive_email}">${software.account_executive_email}</a></p>` : ''}
        </div>
      ` : ''}
      
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #0369a1;">Recommended Actions</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${software.license_type === 'Per User/Seat' ? `
            <li>Consider purchasing additional seats before reaching capacity</li>
            <li>Review current seat assignments and remove inactive users</li>
            <li>Plan for upcoming team growth and budget accordingly</li>
          ` : software.license_type === 'Usage-Based' ? `
            <li>Monitor usage trends to predict when limits will be reached</li>
            <li>Consider upgrading to a higher usage tier</li>
            <li>Optimize usage patterns to stay within limits</li>
          ` : ''}
          <li>Contact your account executive to discuss pricing options</li>
          <li>Schedule a review meeting with your team to assess needs</li>
        </ul>
      </div>
      
      <p>Best regards,<br>SaaS Manager System</p>
    </div>
  `;
  
  return { subject, body };
};

// Send utilization warnings
export const sendUtilizationWarnings = async () => {
  try {
    // Get all active software with utilization data
    const query = `
      SELECT s.*,
             np.user_id, np.utilization_threshold,
             u.name as user_name, u.email as user_email, u.role as user_role,
             np.email_address as preferred_email
      FROM software s
      LEFT JOIN users u ON u.is_active = 1
      LEFT JOIN notification_preferences np ON np.user_id = u.id 
        AND np.notification_type = 'Utilization Warning' 
        AND np.is_enabled = 1
        AND np.utilization_threshold IS NOT NULL
      WHERE s.status = 'Active'
        AND (
          (s.license_type = 'Per User/Seat' AND s.seats_purchased > 0 AND s.seats_utilized > 0) OR
          (s.license_type = 'Usage-Based' AND s.usage_limit > 0 AND s.current_usage > 0)
        )
        AND np.user_id IS NOT NULL
    `;

    const softwareWithPreferences = await new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let sentCount = 0;
    
    for (const item of softwareWithPreferences) {
      let utilizationPercentage = 0;
      
      if (item.license_type === 'Per User/Seat' && item.seats_purchased > 0) {
        utilizationPercentage = Math.round((item.seats_utilized / item.seats_purchased) * 100);
      } else if (item.license_type === 'Usage-Based' && item.usage_limit > 0) {
        utilizationPercentage = Math.round((item.current_usage / item.usage_limit) * 100);
      }
      
      // Check if utilization exceeds the user's threshold
      if (utilizationPercentage >= item.utilization_threshold) {
        const user = {
          name: item.user_name,
          email: item.user_email,
          role: item.user_role
        };
        
        const software = {
          name: item.name,
          vendor: item.vendor,
          license_type: item.license_type,
          cost: item.cost,
          payment_frequency: item.payment_frequency,
          seats_purchased: item.seats_purchased,
          seats_utilized: item.seats_utilized,
          current_usage: item.current_usage,
          usage_limit: item.usage_limit,
          usage_metric: item.usage_metric,
          account_executive: item.account_executive,
          account_executive_email: item.account_executive_email
        };
        
        const email = generateUtilizationWarningEmail(software, user, utilizationPercentage, item.utilization_threshold);
        const recipientEmail = item.preferred_email || item.user_email;
        
        await sendEmailNotification(
          recipientEmail,
          user.name,
          email.subject,
          email.body,
          'Utilization Warning',
          item.id
        );
        
        sentCount++;
      }
    }

    console.log(`Sent ${sentCount} utilization warning emails`);
    return { success: true, message: `Sent ${sentCount} utilization warnings` };

  } catch (error) {
    console.error('Error sending utilization warnings:', error);
    return { success: false, message: error.message };
  }
};

// Run all scheduled notifications
export const runScheduledNotifications = async () => {
  console.log('Running scheduled email notifications...');
  
  try {
    const renewalResults = await sendRenewalReminders();
    const auditResults = await sendAuditReminders();
    const utilizationResults = await sendUtilizationWarnings();
    
    console.log('Scheduled notifications completed:', {
      renewals: renewalResults,
      audits: auditResults,
      utilization: utilizationResults
    });
    
    return {
      success: true,
      renewals: renewalResults,
      audits: auditResults,
      utilization: utilizationResults
    };
  } catch (error) {
    console.error('Error running scheduled notifications:', error);
    return { success: false, message: error.message };
  }
};