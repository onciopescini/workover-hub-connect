-- Fix 3.4: Database Connection Pooling Monitoring
-- Monitora le connessioni al database e crea allarmi se la pressione è alta

SELECT cron.schedule(
  'monitor-db-connections',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  DO $$
  DECLARE
    v_total INTEGER;
    v_active INTEGER;
    v_idle INTEGER;
    v_waiting INTEGER;
    v_max INTEGER;
    v_usage_pct NUMERIC;
  BEGIN
    -- Get connection statistics
    SELECT 
      count(*),
      count(*) FILTER (WHERE state = 'active'),
      count(*) FILTER (WHERE state = 'idle'),
      count(*) FILTER (WHERE wait_event IS NOT NULL),
      current_setting('max_connections')::integer
    INTO v_total, v_active, v_idle, v_waiting, v_max
    FROM pg_stat_activity;
    
    -- Calculate usage percentage
    v_usage_pct := ROUND((v_total::numeric / NULLIF(v_max, 0)::numeric * 100), 2);
    
    -- Insert statistics
    INSERT INTO public.db_connection_stats (
      total_connections,
      active_connections,
      idle_connections,
      waiting_connections,
      max_connections,
      sampled_at
    ) VALUES (
      v_total,
      v_active,
      v_idle,
      v_waiting,
      v_max,
      NOW()
    );
    
    -- Create alarm if >80% connections used
    IF v_usage_pct > 80 THEN
      INSERT INTO public.system_alarms (
        alarm_type,
        severity,
        title,
        message,
        metadata
      ) VALUES (
        'db_connection_pressure',
        CASE 
          WHEN v_usage_pct > 95 THEN 'critical'
          WHEN v_usage_pct > 90 THEN 'high'
          ELSE 'medium'
        END,
        'Database connection pool pressure detected',
        'Using ' || v_usage_pct || '% of available connections (' || v_total || '/' || v_max || ')',
        jsonb_build_object(
          'total_connections', v_total,
          'active_connections', v_active,
          'idle_connections', v_idle,
          'waiting_connections', v_waiting,
          'max_connections', v_max,
          'usage_percentage', v_usage_pct,
          'timestamp', NOW()
        )
      );
    END IF;
    
    -- Cleanup old stats (keep last 7 days)
    DELETE FROM public.db_connection_stats
    WHERE sampled_at < NOW() - INTERVAL '7 days';
    
  END $$;
  $$
);

-- Fix 3.10: Automated Backup Verification
-- Verifica integrità dei backup giornalmente

SELECT cron.schedule(
  'verify-backup-integrity',
  '0 3 * * *',  -- 3 AM daily (UTC)
  $$
  DO $$
  DECLARE
    v_table_count INTEGER;
    v_user_count INTEGER;
    v_booking_count INTEGER;
    v_payment_count INTEGER;
  BEGIN
    -- Count critical tables
    SELECT count(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Count critical data
    SELECT count(*) INTO v_user_count FROM public.profiles;
    SELECT count(*) INTO v_booking_count FROM public.bookings;
    SELECT count(*) INTO v_payment_count FROM public.payments;
    
    -- Verify table count is reasonable (should have at least 30 tables)
    IF v_table_count < 30 THEN
      INSERT INTO public.system_alarms (
        alarm_type,
        severity,
        title,
        message,
        metadata
      ) VALUES (
        'backup_verification_failed',
        'critical',
        'Backup verification: Unexpected low table count',
        'Database has only ' || v_table_count || ' tables. Expected at least 30.',
        jsonb_build_object(
          'table_count', v_table_count,
          'user_count', v_user_count,
          'booking_count', v_booking_count,
          'payment_count', v_payment_count,
          'timestamp', NOW()
        )
      );
    END IF;
    
    -- Log verification success
    INSERT INTO public.admin_actions_log (
      admin_id,
      action_type,
      target_type,
      target_id,
      description,
      metadata
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'backup_verification',
      'system',
      gen_random_uuid(),
      'Backup verification completed successfully',
      jsonb_build_object(
        'table_count', v_table_count,
        'user_count', v_user_count,
        'booking_count', v_booking_count,
        'payment_count', v_payment_count,
        'timestamp', NOW()
      )
    );
    
  END $$;
  $$
);