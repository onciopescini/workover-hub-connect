-- Funzione sicura per calcolare le metriche host senza esporre i dettagli dei pagamenti coworker
CREATE OR REPLACE FUNCTION public.get_host_metrics(host_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month date := date_trunc('month', CURRENT_DATE);
  last_month date := date_trunc('month', CURRENT_DATE - interval '1 month');
  
  total_revenue numeric := 0;
  monthly_revenue numeric := 0;
  last_month_revenue numeric := 0;
  total_bookings integer := 0;
  pending_bookings integer := 0;
  confirmed_bookings integer := 0;
  occupancy_rate numeric := 0;
  average_booking_value numeric := 0;
  revenue_growth numeric := 0;
  top_performing_space json := null;
  
  space_ids uuid[];
  space_count integer := 0;
BEGIN
  -- Ottieni gli ID degli spazi dell'host
  SELECT array_agg(id), count(*) 
  INTO space_ids, space_count
  FROM spaces 
  WHERE host_id = host_id_param;

  -- Se non ci sono spazi, restituisci metriche vuote
  IF space_ids IS NULL OR array_length(space_ids, 1) = 0 THEN
    RETURN json_build_object(
      'totalRevenue', 0,
      'monthlyRevenue', 0,
      'totalBookings', 0,
      'pendingBookings', 0,
      'confirmedBookings', 0,
      'occupancyRate', 0,
      'averageBookingValue', 0,
      'revenueGrowth', 0,
      'topPerformingSpace', null
    );
  END IF;

  -- Calcola revenue totale (solo pagamenti completed)
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.host_amount IS NOT NULL THEN p.host_amount
      ELSE p.amount / 1.05
    END
  ), 0)
  INTO total_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = ANY(space_ids)
    AND p.payment_status = 'completed';

  -- Calcola revenue mensile corrente
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.host_amount IS NOT NULL THEN p.host_amount
      ELSE p.amount / 1.05
    END
  ), 0)
  INTO monthly_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = ANY(space_ids)
    AND p.payment_status = 'completed'
    AND date_trunc('month', p.created_at) = current_month;

  -- Calcola revenue mese scorso
  SELECT COALESCE(SUM(
    CASE 
      WHEN p.host_amount IS NOT NULL THEN p.host_amount
      ELSE p.amount / 1.05
    END
  ), 0)
  INTO last_month_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = ANY(space_ids)
    AND p.payment_status = 'completed'
    AND date_trunc('month', p.created_at) = last_month;

  -- Calcola crescita revenue
  IF last_month_revenue > 0 THEN
    revenue_growth := ((monthly_revenue - last_month_revenue) / last_month_revenue) * 100;
  ELSE
    revenue_growth := 0;
  END IF;

  -- Conta prenotazioni
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'confirmed')
  INTO total_bookings, pending_bookings, confirmed_bookings
  FROM bookings b
  JOIN payments p ON p.booking_id = b.id
  WHERE b.space_id = ANY(space_ids)
    AND p.payment_status = 'completed';

  -- Calcola valore medio prenotazione
  IF confirmed_bookings > 0 THEN
    average_booking_value := total_revenue / confirmed_bookings;
  END IF;

  -- Calcola tasso occupazione (semplificato)
  SELECT (COUNT(*) FILTER (WHERE status = 'confirmed' AND date_trunc('month', booking_date) = current_month)::numeric / (space_count * EXTRACT(DAY FROM date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day'))::numeric) * 100
  INTO occupancy_rate
  FROM bookings b
  JOIN payments p ON p.booking_id = b.id
  WHERE b.space_id = ANY(space_ids)
    AND p.payment_status = 'completed';

  -- Trova spazio con migliori performance
  SELECT json_build_object(
    'id', s.id,
    'title', s.title,
    'revenue', space_revenue.revenue
  )
  INTO top_performing_space
  FROM (
    SELECT 
      b.space_id,
      SUM(
        CASE 
          WHEN p.host_amount IS NOT NULL THEN p.host_amount
          ELSE p.amount / 1.05
        END
      ) as revenue
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.space_id = ANY(space_ids)
      AND p.payment_status = 'completed'
    GROUP BY b.space_id
    ORDER BY revenue DESC
    LIMIT 1
  ) space_revenue
  JOIN spaces s ON s.id = space_revenue.space_id;

  RETURN json_build_object(
    'totalRevenue', ROUND(total_revenue, 2),
    'monthlyRevenue', ROUND(monthly_revenue, 2),
    'totalBookings', total_bookings,
    'pendingBookings', pending_bookings,
    'confirmedBookings', confirmed_bookings,
    'occupancyRate', ROUND(COALESCE(occupancy_rate, 0), 1),
    'averageBookingValue', ROUND(average_booking_value, 2),
    'revenueGrowth', ROUND(revenue_growth, 1),
    'topPerformingSpace', top_performing_space
  );
END;
$$;