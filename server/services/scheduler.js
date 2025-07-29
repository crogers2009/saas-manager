import cron from 'node-cron';
import { processAutoRenewals } from './autoRenewal.js';

let schedulerInitialized = false;

/**
 * Initialize the scheduler with various automated tasks
 */
export const initializeScheduler = () => {
  if (schedulerInitialized) {
    console.log('Scheduler already initialized');
    return;
  }

  console.log('Initializing automated scheduler...');

  // Auto-renewal job - runs daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Running daily auto-renewal check...');
    try {
      const result = await processAutoRenewals();
      console.log(`Auto-renewal completed: ${result.renewedCount} contracts renewed out of ${result.totalProcessed} processed`);
      
      // Log any failures
      const failures = result.results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log('Auto-renewal failures:');
        failures.forEach(failure => {
          console.log(`- ${failure.softwareName} (${failure.softwareId}): ${failure.error}`);
        });
      }
    } catch (error) {
      console.error('Error during auto-renewal process:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/Chicago"
  });

  // Optional: Run auto-renewal check on server startup (for testing/development)
  // Comment this out in production if you don't want immediate processing
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Running initial auto-renewal check...');
    setTimeout(async () => {
      try {
        const result = await processAutoRenewals();
        console.log(`Initial auto-renewal check completed: ${result.renewedCount} contracts renewed`);
      } catch (error) {
        console.error('Error during initial auto-renewal check:', error);
      }
    }, 5000); // Wait 5 seconds after server start
  }

  schedulerInitialized = true;
  console.log('Scheduler initialized successfully');
  console.log('- Auto-renewal job scheduled for 1:00 AM daily (America/Chicago timezone)');
};

/**
 * Manually trigger auto-renewal process (for admin use)
 */
export const manuallyTriggerAutoRenewal = async () => {
  console.log('Manually triggering auto-renewal process...');
  try {
    const result = await processAutoRenewals();
    console.log(`Manual auto-renewal completed: ${result.renewedCount} contracts renewed`);
    return result;
  } catch (error) {
    console.error('Error during manual auto-renewal:', error);
    throw error;
  }
};