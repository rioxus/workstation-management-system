import { useEffect } from 'react';
import { dataService } from '../lib/dataService';

/**
 * DatabaseKeepAlive Component
 * 
 * Prevents Supabase free tier database from going inactive due to 7-day inactivity policy.
 * 
 * How it works:
 * - Makes a lightweight API call every 3 days (72 hours)
 * - Stores last ping timestamp in localStorage to persist across sessions
 * - Runs automatically when app loads or when timer expires
 * - Only pings if 3 days have passed since last successful ping
 * 
 * This component should be included once in your main App component.
 */
export function DatabaseKeepAlive() {
  const PING_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
  const STORAGE_KEY = 'supabase_last_ping';

  const shouldPing = (): boolean => {
    try {
      const lastPingStr = localStorage.getItem(STORAGE_KEY);
      if (!lastPingStr) return true; // First time, need to ping
      
      const lastPing = new Date(lastPingStr).getTime();
      const now = Date.now();
      const timeSinceLastPing = now - lastPing;
      
      return timeSinceLastPing >= PING_INTERVAL;
    } catch (error) {
      console.warn('Error checking ping status:', error);
      return true; // Ping on error to be safe
    }
  };

  const performPing = async () => {
    try {
      const result = await dataService.keepAlive();
      
      if (result.success) {
        // Store successful ping timestamp
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        console.log('🟢 Database keep-alive: Next ping in 3 days');
      } else {
        console.warn('🟡 Database keep-alive ping failed, will retry on next load');
      }
    } catch (error) {
      console.warn('🔴 Database keep-alive error:', error);
    }
  };

  const getNextPingInfo = (): string => {
    try {
      const lastPingStr = localStorage.getItem(STORAGE_KEY);
      if (!lastPingStr) return 'Not yet pinged';
      
      const lastPing = new Date(lastPingStr).getTime();
      const nextPing = new Date(lastPing + PING_INTERVAL);
      const now = Date.now();
      const timeUntilNext = nextPing.getTime() - now;
      
      if (timeUntilNext <= 0) return 'Due now';
      
      const daysUntil = Math.floor(timeUntilNext / (24 * 60 * 60 * 1000));
      const hoursUntil = Math.floor((timeUntilNext % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      
      return `${daysUntil}d ${hoursUntil}h`;
    } catch (error) {
      return 'Unknown';
    }
  };

  useEffect(() => {
    // Check if we need to ping on mount
    if (shouldPing()) {
      console.log('🔵 Initiating database keep-alive ping...');
      performPing();
    } else {
      const nextPingInfo = getNextPingInfo();
      console.log(`🟢 Database keep-alive active. Next ping in: ${nextPingInfo}`);
    }

    // Set up interval to check every hour if ping is needed
    const checkInterval = setInterval(() => {
      if (shouldPing()) {
        console.log('🔵 Periodic check: Initiating database keep-alive ping...');
        performPing();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(checkInterval);
  }, []);

  // This component doesn't render anything
  return null;
}
