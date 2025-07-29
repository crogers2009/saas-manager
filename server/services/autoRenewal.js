import { db } from '../database.js';
import crypto from 'crypto';

/**
 * Calculate the next renewal date based on payment frequency
 */
const calculateNextRenewalDate = (currentRenewalDate, paymentFrequency) => {
  const date = new Date(currentRenewalDate);
  
  switch (paymentFrequency) {
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'One Time':
      // One-time payments don't auto-renew
      return null;
    default:
      // Default to monthly if unknown frequency
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date.toISOString();
};

/**
 * Process automatic renewals for software with auto-renewal enabled
 * This should be called daily to check for contracts that need renewal
 */
export const processAutoRenewals = () => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`Processing auto-renewals for date: ${todayISO}`);
    
    // Find all software with auto-renewal enabled where renewal date is today or past
    const query = `
      SELECT * FROM software 
      WHERE auto_renewal = 1 
      AND date(renewal_date) <= date(?)
      AND payment_frequency != 'One Time'
    `;
    
    db.all(query, [todayISO], async (err, softwareList) => {
      if (err) {
        console.error('Error fetching auto-renewal software:', err);
        reject(err);
        return;
      }
      
      if (softwareList.length === 0) {
        console.log('No software contracts need auto-renewal today');
        resolve({ renewedCount: 0, results: [] });
        return;
      }
      
      console.log(`Found ${softwareList.length} software contracts to auto-renew`);
      
      const renewalResults = [];
      let processedCount = 0;
      
      // Process each software renewal
      for (const software of softwareList) {
        try {
          const result = await processIndividualRenewal(software);
          renewalResults.push(result);
        } catch (error) {
          console.error(`Error auto-renewing software ${software.id} (${software.name}):`, error);
          renewalResults.push({
            softwareId: software.id,
            softwareName: software.name,
            success: false,
            error: error.message
          });
        }
        
        processedCount++;
      }
      
      console.log(`Auto-renewal processing completed: ${renewalResults.filter(r => r.success).length}/${processedCount} successful`);
      
      resolve({
        renewedCount: renewalResults.filter(r => r.success).length,
        totalProcessed: processedCount,
        results: renewalResults
      });
    });
  });
};

/**
 * Process renewal for an individual software contract
 */
const processIndividualRenewal = (software) => {
  return new Promise((resolve, reject) => {
    const nextRenewalDate = calculateNextRenewalDate(software.renewal_date, software.payment_frequency);
    
    if (!nextRenewalDate) {
      resolve({
        softwareId: software.id,
        softwareName: software.name,
        success: false,
        error: 'One-time payment contracts cannot be auto-renewed'
      });
      return;
    }
    
    const historyId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    db.serialize(() => {
      // Create history record for the current contract period
      db.run(`INSERT INTO contract_history (
        id, software_id, contract_start_date, contract_end_date, cost,
        payment_frequency, notice_period, auto_renewal, status, created_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId, 
        software.id, 
        software.contract_start_date, 
        software.renewal_date, 
        software.cost,
        software.payment_frequency, 
        software.notice_period, 
        software.auto_renewal, 
        'Auto-Renewed', 
        now, 
        `Automatically renewed on ${now.split('T')[0]} for next ${software.payment_frequency.toLowerCase()} period`
      ], (err) => {
        if (err) {
          reject(new Error(`Failed to create contract history: ${err.message}`));
          return;
        }

        // Update the software with new contract period
        // New contract starts on the previous renewal date
        // Next renewal date is calculated based on payment frequency
        db.run(`UPDATE software SET 
          contract_start_date = ?, 
          renewal_date = ?
          WHERE id = ?`,
          [software.renewal_date, nextRenewalDate, software.id],
          function(err) {
            if (err) {
              reject(new Error(`Failed to update software contract: ${err.message}`));
              return;
            }

            console.log(`Auto-renewed contract for ${software.name} (${software.id}). New period: ${software.renewal_date} to ${nextRenewalDate}`);
            
            resolve({
              softwareId: software.id,
              softwareName: software.name,
              success: true,
              previousContractEnd: software.renewal_date,
              newContractStart: software.renewal_date,
              newContractEnd: nextRenewalDate,
              paymentFrequency: software.payment_frequency,
              cost: software.cost
            });
          }
        );
      });
    });
  });
};

/**
 * Get upcoming auto-renewals (for reporting/dashboard purposes)
 */
export const getUpcomingAutoRenewals = (daysAhead = 30) => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    const todayISO = today.toISOString().split('T')[0];
    const futureDateISO = futureDate.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        s.id,
        s.name,
        s.vendor,
        s.cost,
        s.payment_frequency,
        s.renewal_date,
        s.auto_renewal,
        u.name as owner_name
      FROM software s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.auto_renewal = 1 
      AND date(s.renewal_date) BETWEEN date(?) AND date(?)
      AND s.payment_frequency != 'One Time'
      ORDER BY s.renewal_date ASC
    `;
    
    db.all(query, [todayISO, futureDateISO], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const upcomingRenewals = rows.map(row => ({
        id: row.id,
        name: row.name,
        vendor: row.vendor,
        cost: row.cost,
        paymentFrequency: row.payment_frequency,
        renewalDate: row.renewal_date,
        autoRenewal: Boolean(row.auto_renewal),
        ownerName: row.owner_name,
        daysUntilRenewal: Math.ceil((new Date(row.renewal_date) - today) / (1000 * 60 * 60 * 24))
      }));
      
      resolve(upcomingRenewals);
    });
  });
};