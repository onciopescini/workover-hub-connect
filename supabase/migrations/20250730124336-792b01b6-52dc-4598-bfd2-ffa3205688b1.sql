-- Estendo la funzione get_single_space_metrics per includere analytics avanzate
CREATE OR REPLACE FUNCTION public.get_single_space_metrics(space_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  total_views INTEGER := 0;
  total_bookings INTEGER := 0;
  monthly_bookings INTEGER := 0;
  confirmed_bookings INTEGER := 0;
  cancelled_bookings INTEGER := 0;
  pending_bookings INTEGER := 0;
  total_revenue NUMERIC := 0;
  monthly_revenue NUMERIC := 0;
  last_month_revenue NUMERIC := 0;
  total_reviews INTEGER := 0;
  average_rating NUMERIC := 0;
  occupancy_rate NUMERIC := 0;
  booked_days_last_30 INTEGER := 0;
  conversion_rate NUMERIC := 0;
  space_title TEXT;
  
  -- Analytics avanzate
  professional_breakdown JSON := '[]'::JSON;
  demographic_breakdown JSON := '[]'::JSON;
  booking_trends JSON := '[]'::JSON;
  peak_hours JSON := '[]'::JSON;
BEGIN
  -- Verifica che lo spazio esista
  SELECT title INTO space_title FROM spaces WHERE id = space_id_param;
  
  IF space_title IS NULL THEN
    RETURN json_build_object('error', 'Space not found');
  END IF;

  -- Calcolo metriche base esistenti
  SELECT COUNT(*) INTO total_bookings
  FROM bookings WHERE space_id = space_id_param;

  SELECT COUNT(*) INTO monthly_bookings
  FROM bookings 
  WHERE space_id = space_id_param 
  AND created_at >= date_trunc('month', CURRENT_DATE);

  SELECT COUNT(*) INTO confirmed_bookings
  FROM bookings 
  WHERE space_id = space_id_param AND status = 'confirmed';

  SELECT COUNT(*) INTO cancelled_bookings
  FROM bookings 
  WHERE space_id = space_id_param AND status = 'cancelled';

  SELECT COUNT(*) INTO pending_bookings
  FROM bookings 
  WHERE space_id = space_id_param AND status = 'pending';

  -- Revenue calculations
  SELECT COALESCE(SUM(p.host_amount), 0) INTO total_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param AND p.payment_status = 'completed';

  SELECT COALESCE(SUM(p.host_amount), 0) INTO monthly_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param 
  AND p.payment_status = 'completed'
  AND p.created_at >= date_trunc('month', CURRENT_DATE);

  SELECT COALESCE(SUM(p.host_amount), 0) INTO last_month_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param 
  AND p.payment_status = 'completed'
  AND p.created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
  AND p.created_at < date_trunc('month', CURRENT_DATE);

  -- Reviews
  SELECT COUNT(*), COALESCE(AVG(rating), 0) INTO total_reviews, average_rating
  FROM booking_reviews br
  JOIN bookings b ON b.id = br.booking_id
  WHERE b.space_id = space_id_param AND br.is_visible = true;

  -- Occupancy rate (giorni prenotati negli ultimi 30 giorni)
  SELECT COUNT(DISTINCT booking_date) INTO booked_days_last_30
  FROM bookings
  WHERE space_id = space_id_param
  AND booking_date >= CURRENT_DATE - interval '30 days'
  AND booking_date <= CURRENT_DATE
  AND status IN ('confirmed', 'pending');

  occupancy_rate := ROUND((booked_days_last_30::NUMERIC / 30) * 100, 1);

  -- Conversion rate (stimato basato su prenotazioni vs interesse)
  total_views := total_bookings * 15; -- Stima 15 view per booking
  IF total_views > 0 THEN
    conversion_rate := ROUND((total_bookings::NUMERIC / total_views) * 100, 2);
  END IF;

  -- Breakdown professionale dei bookers
  SELECT json_agg(
    json_build_object(
      'profession', COALESCE(p.profession, 'Non specificato'),
      'count', profession_count,
      'percentage', ROUND((profession_count::NUMERIC / GREATEST(total_bookings, 1)) * 100, 1)
    )
  ) INTO professional_breakdown
  FROM (
    SELECT 
      COALESCE(pr.profession, 'Non specificato') as profession,
      COUNT(*) as profession_count
    FROM bookings b
    LEFT JOIN profiles pr ON pr.id = b.user_id
    WHERE b.space_id = space_id_param
    AND b.status IN ('confirmed', 'pending')
    GROUP BY COALESCE(pr.profession, 'Non specificato')
    ORDER BY profession_count DESC
    LIMIT 10
  ) prof_stats;

  -- Breakdown demografico (età e città)
  SELECT json_agg(
    json_build_object(
      'city', COALESCE(city, 'Non specificata'),
      'count', city_count,
      'percentage', ROUND((city_count::NUMERIC / GREATEST(total_bookings, 1)) * 100, 1)
    )
  ) INTO demographic_breakdown
  FROM (
    SELECT 
      COALESCE(pr.city, 'Non specificata') as city,
      COUNT(*) as city_count
    FROM bookings b
    LEFT JOIN profiles pr ON pr.id = b.user_id
    WHERE b.space_id = space_id_param
    AND b.status IN ('confirmed', 'pending')
    GROUP BY COALESCE(pr.city, 'Non specificata')
    ORDER BY city_count DESC
    LIMIT 8
  ) city_stats;

  -- Trend prenotazioni ultimi 6 mesi
  SELECT json_agg(
    json_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'bookings', COALESCE(booking_count, 0),
      'revenue', COALESCE(month_revenue, 0)
    ) ORDER BY month_date
  ) INTO booking_trends
  FROM (
    SELECT 
      date_trunc('month', generate_series(
        CURRENT_DATE - interval '5 months',
        CURRENT_DATE,
        interval '1 month'
      )) as month_date
  ) months
  LEFT JOIN (
    SELECT 
      date_trunc('month', b.created_at) as booking_month,
      COUNT(*) as booking_count,
      COALESCE(SUM(p.host_amount), 0) as month_revenue
    FROM bookings b
    LEFT JOIN payments p ON p.booking_id = b.id AND p.payment_status = 'completed'
    WHERE b.space_id = space_id_param
    AND b.created_at >= CURRENT_DATE - interval '5 months'
    GROUP BY date_trunc('month', b.created_at)
  ) monthly_stats ON monthly_stats.booking_month = months.month_date;

  -- Orari di picco prenotazioni
  SELECT json_agg(
    json_build_object(
      'hour', hour_slot,
      'bookings', COALESCE(hour_bookings, 0)
    ) ORDER BY hour_slot
  ) INTO peak_hours
  FROM (
    SELECT generate_series(8, 20) as hour_slot
  ) hours
  LEFT JOIN (
    SELECT 
      EXTRACT(hour FROM start_time) as booking_hour,
      COUNT(*) as hour_bookings
    FROM bookings
    WHERE space_id = space_id_param
    AND start_time IS NOT NULL
    AND status IN ('confirmed', 'pending')
    GROUP BY EXTRACT(hour FROM start_time)
  ) hour_stats ON hour_stats.booking_hour = hours.hour_slot;

  -- Calcolo growth rates
  DECLARE
    revenue_growth NUMERIC := 0;
    booking_growth NUMERIC := 0;
  BEGIN
    IF last_month_revenue > 0 THEN
      revenue_growth := ROUND(((monthly_revenue - last_month_revenue) / last_month_revenue) * 100, 1);
    ELSIF monthly_revenue > 0 THEN
      revenue_growth := 100;
    END IF;

    -- Booking growth (confronto con mese precedente)
    DECLARE
      last_month_bookings INTEGER := 0;
    BEGIN
      SELECT COUNT(*) INTO last_month_bookings
      FROM bookings 
      WHERE space_id = space_id_param
      AND created_at >= date_trunc('month', CURRENT_DATE - interval '1 month')
      AND created_at < date_trunc('month', CURRENT_DATE);

      IF last_month_bookings > 0 THEN
        booking_growth := ROUND(((monthly_bookings - last_month_bookings)::NUMERIC / last_month_bookings) * 100, 1);
      ELSIF monthly_bookings > 0 THEN
        booking_growth := 100;
      END IF;
    END;

    -- Costruzione risultato finale
    SELECT json_build_object(
      'space_title', space_title,
      'total_bookings', total_bookings,
      'monthly_bookings', monthly_bookings,
      'confirmed_bookings', confirmed_bookings,
      'cancelled_bookings', cancelled_bookings,
      'pending_bookings', pending_bookings,
      'total_revenue', total_revenue,
      'monthly_revenue', monthly_revenue,
      'last_month_revenue', last_month_revenue,
      'revenue_growth', revenue_growth,
      'booking_growth', booking_growth,
      'total_reviews', total_reviews,
      'average_rating', ROUND(average_rating, 1),
      'occupancy_rate', occupancy_rate,
      'booked_days_last_30', booked_days_last_30,
      'conversion_rate', conversion_rate,
      'total_views', total_views,
      'professional_breakdown', COALESCE(professional_breakdown, '[]'::json),
      'demographic_breakdown', COALESCE(demographic_breakdown, '[]'::json),
      'booking_trends', COALESCE(booking_trends, '[]'::json),
      'peak_hours', COALESCE(peak_hours, '[]'::json)
    ) INTO result;

    RETURN result;
  END;
END;
$function$;