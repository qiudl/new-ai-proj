-- Basic analytics views for #463
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE VIEW analytics.v_events_daily_counts AS
SELECT
  date_trunc('day', created_at) AS day,
  event,
  COUNT(*) AS cnt
FROM analytics.events
GROUP BY 1,2
ORDER BY 1 DESC;
