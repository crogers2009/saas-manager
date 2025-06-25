import express from 'express';
import { db } from '../database.js';
import crypto from 'crypto';
import { authenticateUser } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Encryption key for storing SMTP passwords securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';

// Simple encryption/decryption functions (using base64 for simplicity in demo)
const encrypt = (text) => {
  try {
    // For demo purposes, using base64 encoding (in production, use proper encryption)
    return Buffer.from(text, 'utf8').toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text if encryption fails
  }
};

const decrypt = (encryptedText) => {
  try {
    // For demo purposes, using base64 decoding (in production, use proper decryption)
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return encrypted text if decryption fails
  }
};

// Get SMTP configuration (Admin only)
router.get('/smtp-config', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can access SMTP configuration' });
  }

  db.get("SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1", (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      // Return default empty config
      res.json({
        id: '',
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        isActive: false,
        testEmailSent: false,
        createdAt: '',
        updatedAt: ''
      });
      return;
    }

    // Transform database response and decrypt password
    const config = {
      id: row.id,
      host: row.host,
      port: row.port,
      secure: Boolean(row.secure),
      username: row.username,
      password: decrypt(row.password),
      fromEmail: row.from_email,
      fromName: row.from_name,
      isActive: Boolean(row.is_active),
      testEmailSent: Boolean(row.test_email_sent),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json(config);
  });
});

// Update SMTP configuration (Admin only)
router.put('/smtp-config', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can update SMTP configuration' });
  }

  const { host, port, secure, username, password, fromEmail, fromName, isActive } = req.body;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const encryptedPassword = encrypt(password);

  // Delete existing config and insert new one (single config approach)
  db.serialize(() => {
    db.run("DELETE FROM smtp_config");
    db.run(`INSERT INTO smtp_config (
      id, host, port, secure, username, password, from_email, from_name, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, host, port, secure, username, encryptedPassword, fromEmail, fromName, isActive, now, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        id,
        host,
        port,
        secure,
        username,
        password, // Return unencrypted for UI
        fromEmail,
        fromName,
        isActive,
        testEmailSent: false,
        createdAt: now,
        updatedAt: now
      });
    });
  });
});

// Test SMTP connection
router.post('/test-smtp', authenticateUser, async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can test SMTP configuration' });
  }

  const { host, port, secure, username, password, fromEmail, fromName } = req.body;

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: username,
        pass: password,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email to admin
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: req.user.email,
      subject: 'SMTP Configuration Test - SaaS Manager',
      html: `
        <h2>SMTP Configuration Test Successful!</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${host}</li>
          <li>Port: ${port}</li>
          <li>Secure: ${secure ? 'Yes' : 'No'}</li>
          <li>Username: ${username}</li>
        </ul>
        <p>Email notifications are now ready to be sent.</p>
      `,
    });

    res.json({ success: true, message: 'SMTP configuration test successful! Test email sent.' });
  } catch (error) {
    console.error('SMTP test error:', error);
    res.json({ success: false, message: `SMTP test failed: ${error.message}` });
  }
});

// Get user notification preferences
router.get('/preferences/:userId', authenticateUser, (req, res) => {
  const { userId } = req.params;
  
  // Users can only get their own preferences, admins can get any
  if (req.user.role !== 'Administrator' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all("SELECT * FROM notification_preferences WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const preferences = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      notificationType: row.notification_type,
      isEnabled: Boolean(row.is_enabled),
      daysBefore: row.days_before,
      emailAddress: row.email_address,
      utilizationThreshold: row.utilization_threshold
    }));

    res.json(preferences);
  });
});

// Update user notification preferences
router.put('/preferences/:userId', authenticateUser, (req, res) => {
  const { userId } = req.params;
  const preferences = req.body;
  
  // Users can only update their own preferences, admins can update any
  if (req.user.role !== 'Administrator' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.serialize(() => {
    // Delete existing preferences for this user
    db.run("DELETE FROM notification_preferences WHERE user_id = ?", [userId]);
    
    // Insert new preferences
    const stmt = db.prepare(`INSERT INTO notification_preferences (
      id, user_id, notification_type, is_enabled, days_before, email_address, utilization_threshold
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    preferences.forEach(pref => {
      stmt.run(
        pref.id || crypto.randomUUID(),
        userId,
        pref.notificationType,
        pref.isEnabled,
        pref.daysBefore,
        pref.emailAddress,
        pref.utilizationThreshold
      );
    });
    
    stmt.finalize((err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(preferences);
    });
  });
});

// Get email notifications (Admin only)
router.get('/notifications', authenticateUser, (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can view email notifications' });
  }

  db.all("SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 100", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const notifications = rows.map(row => ({
      id: row.id,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      subject: row.subject,
      body: row.body,
      notificationType: row.notification_type,
      relatedEntityId: row.related_entity_id,
      sentAt: row.sent_at,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at
    }));

    res.json(notifications);
  });
});

// Send test email
router.post('/send-test', authenticateUser, async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can send test emails' });
  }

  const { recipientEmail } = req.body;

  try {
    // Get SMTP config
    const config = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1", (err, row) => {
        if (err) reject(err);
        else if (!row) reject(new Error('No active SMTP configuration found'));
        else resolve(row);
      });
    });

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: Boolean(config.secure),
      auth: {
        user: config.username,
        pass: decrypt(config.password),
      },
    });

    // Send test email
    await transporter.sendMail({
      from: `${config.from_name} <${config.from_email}>`,
      to: recipientEmail,
      subject: 'Test Email - SaaS Manager',
      html: `
        <h2>Test Email from SaaS Manager</h2>
        <p>This is a test email to verify that your email notification system is working correctly.</p>
        <p>If you received this email, your SMTP configuration is set up properly!</p>
      `,
    });

    res.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Send test email error:', error);
    res.json({ success: false, message: `Failed to send test email: ${error.message}` });
  }
});

export default router;