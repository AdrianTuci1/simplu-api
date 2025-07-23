export const cronConfig = {
  enabled: process.env.CRON_ENABLED === 'true',
  timezone: process.env.CRON_TIMEZONE || 'Europe/Bucharest',
  memoryThreshold: parseInt(process.env.CRON_MEMORY_THRESHOLD_MB || '500'),
  cpuThreshold: parseInt(process.env.CRON_CPU_THRESHOLD_PERCENT || '80'),
  backup: {
    enabled: process.env.CRON_BACKUP_ENABLED === 'true',
    retentionDays: parseInt(process.env.CRON_BACKUP_RETENTION_DAYS || '30')
  },
  cleanup: {
    sessions: {
      resolvedDays: parseInt(process.env.CRON_CLEANUP_RESOLVED_SESSIONS_DAYS || '30'),
      oldDays: parseInt(process.env.CRON_CLEANUP_OLD_SESSIONS_DAYS || '180'),
      inactiveHours: parseInt(process.env.CRON_CLEANUP_INACTIVE_SESSIONS_HOURS || '24'),
      abandonedHours: parseInt(process.env.CRON_CLEANUP_ABANDONED_SESSIONS_HOURS || '48')
    },
    messages: {
      oldDays: parseInt(process.env.CRON_CLEANUP_OLD_MESSAGES_DAYS || '90')
    },
    logs: {
      oldDays: parseInt(process.env.CRON_CLEANUP_OLD_LOGS_DAYS || '30')
    }
  },
  reminders: {
    enabled: process.env.CRON_REMINDERS_ENABLED === 'true',
    hoursBefore: parseInt(process.env.CRON_REMINDERS_HOURS_BEFORE || '2')
  },
  reports: {
    enabled: process.env.CRON_REPORTS_ENABLED === 'true',
    recipients: process.env.CRON_REPORTS_RECIPIENTS?.split(',') || []
  },
  monitoring: {
    enabled: process.env.CRON_MONITORING_ENABLED === 'true',
    checkIntervalMinutes: parseInt(process.env.CRON_MONITORING_CHECK_INTERVAL_MINUTES || '30')
  }
}; 