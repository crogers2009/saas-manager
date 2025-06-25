import express from 'express';
import { db } from '../database.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', (req, res) => {
  const stats = {};
  
  // Get total active subscriptions
  db.get("SELECT COUNT(*) as count FROM software WHERE status = 'Active'", (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    stats.totalActiveSubscriptions = row.count;
    
    // Calculate monthly and annual spend
    db.all("SELECT cost, payment_frequency FROM software WHERE status = 'Active'", (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      let monthlySpend = 0;
      let annualSpend = 0;
      
      rows.forEach(software => {
        if (software.payment_frequency === 'Monthly') {
          monthlySpend += software.cost;
          annualSpend += software.cost * 12;
        } else if (software.payment_frequency === 'Annually') {
          monthlySpend += software.cost / 12;
          annualSpend += software.cost;
        } else if (software.payment_frequency === 'One Time') {
          annualSpend += software.cost;
        }
      });
      
      stats.monthlySpend = parseFloat(monthlySpend.toFixed(2));
      stats.annualSpend = parseFloat(annualSpend.toFixed(2));
      
      // Get upcoming renewals (30 days)
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];
      
      db.get(`SELECT COUNT(*) as count FROM software 
              WHERE renewal_date >= ? AND renewal_date <= ?`, 
              [today, thirtyDaysFromNowStr], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        stats.upcomingRenewalsCount = row.count;
        
        // Get recent pending requests (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();
        
        db.get(`SELECT COUNT(*) as count FROM software_requests 
                WHERE status = 'Pending' AND request_date >= ?`, 
                [sevenDaysAgoStr], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          stats.recentRequestsCount = row.count;
          
          // Get total unique vendors
          db.get("SELECT COUNT(DISTINCT vendor) as count FROM software", (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            stats.totalVendors = row.count;
            
            // Get total departments
            db.get("SELECT COUNT(*) as count FROM departments", (err, row) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              stats.totalDepartments = row.count;
              
              res.json(stats);
            });
          });
        });
      });
    });
  });
});

export default router;