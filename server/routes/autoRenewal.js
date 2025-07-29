import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { processAutoRenewals, getUpcomingAutoRenewals } from '../services/autoRenewal.js';
import { manuallyTriggerAutoRenewal } from '../services/scheduler.js';

const router = express.Router();

// Get upcoming auto-renewals (for dashboard/reporting)
router.get('/upcoming', authenticateUser, async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const upcomingRenewals = await getUpcomingAutoRenewals(daysAhead);
    res.json(upcomingRenewals);
  } catch (error) {
    console.error('Error fetching upcoming auto-renewals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger auto-renewal process (admin only)
router.post('/trigger', authenticateUser, async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can trigger auto-renewals' });
  }

  try {
    const result = await manuallyTriggerAutoRenewal();
    res.json({
      message: 'Auto-renewal process completed',
      renewedCount: result.renewedCount,
      totalProcessed: result.totalProcessed,
      results: result.results
    });
  } catch (error) {
    console.error('Error during manual auto-renewal trigger:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auto-renewal status/statistics
router.get('/status', authenticateUser, async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can view auto-renewal status' });
  }

  try {
    // Get counts of different renewal types
    const upcomingRenewals = await getUpcomingAutoRenewals(30);
    const todayRenewals = await getUpcomingAutoRenewals(0); // Today only
    
    res.json({
      upcomingInNext30Days: upcomingRenewals.length,
      dueToday: todayRenewals.filter(r => r.daysUntilRenewal === 0).length,
      dueThisWeek: upcomingRenewals.filter(r => r.daysUntilRenewal <= 7).length,
      nextRenewal: upcomingRenewals.length > 0 ? upcomingRenewals[0] : null,
      schedulerInfo: {
        timezone: 'America/Chicago',
        dailyRunTime: '1:00 AM',
        description: 'Auto-renewal process runs daily at 1:00 AM Central Time'
      }
    });
  } catch (error) {
    console.error('Error fetching auto-renewal status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;