-- Migration: add auto_stop_others_default to user_timer_preferences
-- Safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_timer_preferences' AND column_name = 'auto_stop_others_default'
    ) THEN
        ALTER TABLE user_timer_preferences
        ADD COLUMN auto_stop_others_default BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN user_timer_preferences.auto_stop_others_default IS '启动新计时器时是否默认自动停止其他计时器';
    END IF;
END $$;
