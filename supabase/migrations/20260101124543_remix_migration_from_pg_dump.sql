CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: apply_discount_code(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_discount_code(p_code text, p_order_amount numeric) RETURNS TABLE(discount_id uuid, discount_type text, discount_value numeric, discount_amount numeric, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_discount RECORD;
  v_calculated_discount NUMERIC;
BEGIN
  -- Lock the discount code row to prevent concurrent modifications
  SELECT 
    id,
    code,
    discount_codes.discount_type as dtype,
    discount_codes.discount_value as dvalue,
    usage_count,
    usage_limit,
    valid_from,
    valid_until,
    minimum_purchase,
    active
  INTO v_discount
  FROM public.discount_codes
  WHERE code = p_code
  FOR UPDATE;
  
  -- Validation checks
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Invalid discount code'::TEXT;
    RETURN;
  END IF;
  
  IF NOT v_discount.active THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Discount code is not active'::TEXT;
    RETURN;
  END IF;
  
  IF v_discount.valid_from > NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Discount code is not yet valid'::TEXT;
    RETURN;
  END IF;
  
  IF v_discount.valid_until IS NOT NULL AND v_discount.valid_until < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Discount code has expired'::TEXT;
    RETURN;
  END IF;
  
  IF v_discount.usage_limit IS NOT NULL AND v_discount.usage_count >= v_discount.usage_limit THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Discount code usage limit reached'::TEXT;
    RETURN;
  END IF;
  
  IF p_order_amount < v_discount.minimum_purchase THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 
      'Order amount does not meet minimum purchase requirement'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount amount
  IF v_discount.dtype = 'percentage' THEN
    v_calculated_discount := (p_order_amount * v_discount.dvalue / 100);
  ELSIF v_discount.dtype = 'fixed' THEN
    v_calculated_discount := LEAST(v_discount.dvalue, p_order_amount);
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Invalid discount type'::TEXT;
    RETURN;
  END IF;
  
  -- Atomically increment usage count
  UPDATE public.discount_codes
  SET usage_count = usage_count + 1
  WHERE id = v_discount.id;
  
  -- Return success with discount details
  RETURN QUERY SELECT 
    v_discount.id,
    v_discount.dtype,
    v_discount.dvalue,
    v_calculated_discount,
    NULL::TEXT;
END;
$$;


--
-- Name: check_login_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_login_rate_limit(p_identifier text, p_max_attempts integer DEFAULT 5, p_lockout_minutes integer DEFAULT 15) RETURNS TABLE(is_blocked boolean, remaining_attempts integer, blocked_until timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_record RECORD;
  v_is_blocked BOOLEAN := FALSE;
  v_remaining INTEGER := p_max_attempts;
  v_blocked_until TIMESTAMPTZ := NULL;
BEGIN
  -- Get current rate limit record
  SELECT la.attempts, la.blocked_until, la.last_attempt_at
  INTO v_record
  FROM public.login_attempts la
  WHERE la.identifier = p_identifier
    AND la.last_attempt_at > now() - INTERVAL '24 hours';

  IF FOUND THEN
    -- Check if currently blocked
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
      v_is_blocked := TRUE;
      v_blocked_until := v_record.blocked_until;
      v_remaining := 0;
    ELSE
      v_remaining := GREATEST(0, p_max_attempts - v_record.attempts);
      IF v_remaining = 0 THEN
        v_is_blocked := TRUE;
        v_blocked_until := now() + (p_lockout_minutes || ' minutes')::INTERVAL;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_is_blocked, v_remaining, v_blocked_until;
END;
$$;


--
-- Name: check_otp_rate_limit(text, text, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_otp_rate_limit(p_identifier text, p_otp_type text, p_max_requests integer DEFAULT 3, p_window_minutes integer DEFAULT 15, p_lockout_minutes integer DEFAULT 30) RETURNS TABLE(is_blocked boolean, remaining_requests integer, blocked_until timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_record RECORD;
  v_is_blocked BOOLEAN := FALSE;
  v_remaining INTEGER := p_max_requests;
  v_blocked_until TIMESTAMPTZ := NULL;
BEGIN
  SELECT orl.request_count, orl.blocked_until, orl.first_request_at
  INTO v_record
  FROM public.otp_rate_limits orl
  WHERE orl.identifier = p_identifier
    AND orl.otp_type = p_otp_type;

  IF FOUND THEN
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
      v_is_blocked := TRUE;
      v_blocked_until := v_record.blocked_until;
      v_remaining := 0;
    ELSIF v_record.first_request_at > now() - (p_window_minutes || ' minutes')::INTERVAL THEN
      v_remaining := GREATEST(0, p_max_requests - v_record.request_count);
      IF v_remaining = 0 THEN
        v_is_blocked := TRUE;
        v_blocked_until := now() + (p_lockout_minutes || ' minutes')::INTERVAL;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_is_blocked, v_remaining, v_blocked_until;
END;
$$;


--
-- Name: cleanup_expired_2fa_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_2fa_codes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.user_2fa_codes
  WHERE expires_at < now();
END;
$$;


--
-- Name: cleanup_expired_verification_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_verification_codes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.email_verification_codes
  WHERE expires_at < now();
END;
$$;


--
-- Name: cleanup_old_login_attempts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_login_attempts() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE last_attempt_at < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;


--
-- Name: cleanup_old_otp_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_otp_rate_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.otp_rate_limits
  WHERE last_request_at < now() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;


--
-- Name: clear_login_attempts(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_login_attempts(p_identifier text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE identifier = p_identifier;
END;
$$;


--
-- Name: get_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid()::text
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_purchased_product(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_purchased_product(p_user_id uuid, p_product_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
      AND oi.product_id = p_product_id::text
      AND o.status IN ('delivered', 'completed')
  );
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_owner(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_owner(check_user_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid()::text = check_user_id
$$;


--
-- Name: is_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_owner(check_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() = check_user_id
$$;


--
-- Name: record_failed_login(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_failed_login(p_identifier text, p_fingerprint text DEFAULT NULL::text, p_max_attempts integer DEFAULT 5, p_lockout_minutes integer DEFAULT 15) RETURNS TABLE(is_blocked boolean, remaining_attempts integer, blocked_until timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_attempts INTEGER;
  v_is_blocked BOOLEAN := FALSE;
  v_remaining INTEGER;
  v_blocked_until TIMESTAMPTZ := NULL;
BEGIN
  -- Upsert login attempt record
  INSERT INTO public.login_attempts (identifier, fingerprint, attempts, last_attempt_at)
  VALUES (p_identifier, p_fingerprint, 1, now())
  ON CONFLICT (identifier) DO UPDATE SET
    attempts = CASE 
      WHEN login_attempts.last_attempt_at < now() - INTERVAL '1 hour' THEN 1
      ELSE login_attempts.attempts + 1
    END,
    last_attempt_at = now(),
    fingerprint = COALESCE(p_fingerprint, login_attempts.fingerprint),
    blocked_until = CASE
      WHEN login_attempts.attempts + 1 >= p_max_attempts 
        AND (login_attempts.blocked_until IS NULL OR login_attempts.blocked_until < now())
      THEN now() + (p_lockout_minutes || ' minutes')::INTERVAL
      ELSE login_attempts.blocked_until
    END
  RETURNING login_attempts.attempts, login_attempts.blocked_until INTO v_attempts, v_blocked_until;

  v_remaining := GREATEST(0, p_max_attempts - v_attempts);
  v_is_blocked := v_remaining = 0 OR (v_blocked_until IS NOT NULL AND v_blocked_until > now());

  RETURN QUERY SELECT v_is_blocked, v_remaining, v_blocked_until;
END;
$$;


--
-- Name: send_order_status_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_order_status_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_email_type TEXT;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine email type based on new status
  v_email_type := CASE NEW.status
    WHEN 'shipped' THEN 'shipped'
    WHEN 'delivered' THEN 'delivered'
    ELSE NULL
  END;

  -- Only send emails for shipped and delivered statuses
  IF v_email_type IS NOT NULL THEN
    -- Get environment variables
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

    -- Use default values if settings not found
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://kpectwxfpvsbareadkbt.supabase.co';
    END IF;
    
    IF v_supabase_anon_key IS NULL THEN
      v_supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZWN0d3hmcHZzYmFyZWFka2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjEyNTgsImV4cCI6MjA3NzA5NzI1OH0.kD9PgFuMthBSQ-D1UeuiZAl4FhBB4770L3GGowc0N8A';
    END IF;

    -- Make async HTTP request to edge function
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-order-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_supabase_anon_key
      ),
      body := jsonb_build_object(
        'type', v_email_type,
        'orderId', NEW.id,
        'orderNumber', NEW.order_number,
        'userId', NEW.user_id,
        'trackingNumber', NEW.tracking_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_2fa_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_2fa_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_blog_content_size(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_blog_content_size() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Limit content to 100KB (approximately 100,000 characters)
  IF length(NEW.content) > 100000 THEN
    RAISE EXCEPTION 'Blog content exceeds maximum allowed size (100KB)';
  END IF;
  
  -- Limit title to 500 characters
  IF length(NEW.title) > 500 THEN
    RAISE EXCEPTION 'Blog title exceeds maximum allowed length (500 characters)';
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: abandoned_cart_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abandoned_cart_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    cart_items_snapshot jsonb NOT NULL,
    email_sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    author text NOT NULL,
    excerpt text,
    content text NOT NULL,
    image_url text,
    category text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT cart_quantity_check CHECK (((quantity >= 1) AND (quantity <= 999)))
);

ALTER TABLE ONLY public.cart_items REPLICA IDENTITY FULL;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    address_type text,
    is_default boolean DEFAULT false,
    full_name text NOT NULL,
    phone text,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_addresses_address_type_check CHECK ((address_type = ANY (ARRAY['shipping'::text, 'billing'::text])))
);


--
-- Name: discount_code_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_code_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discount_code_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    minimum_purchase numeric DEFAULT 0,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    applies_to text DEFAULT 'all'::text,
    CONSTRAINT discount_codes_applies_to_check CHECK ((applies_to = ANY (ARRAY['all'::text, 'specific'::text]))),
    CONSTRAINT discount_codes_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'free_shipping'::text])))
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: email_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.favorites REPLICA IDENTITY FULL;


--
-- Name: gift_card_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_card_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gift_card_id uuid NOT NULL,
    order_id uuid,
    amount numeric NOT NULL,
    transaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_card_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['purchase'::text, 'redeem'::text, 'refund'::text])))
);


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    initial_balance numeric NOT NULL,
    current_balance numeric NOT NULL,
    recipient_email text,
    sender_user_id uuid,
    active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity_change integer NOT NULL,
    reason text NOT NULL,
    notes text,
    admin_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_adjustments_reason_check CHECK ((reason = ANY (ARRAY['sale'::text, 'restock'::text, 'return'::text, 'damage'::text, 'adjustment'::text])))
);


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_posting_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    cover_letter text,
    resume_path text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'interview'::text, 'rejected'::text, 'hired'::text])))
);


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    department text NOT NULL,
    location text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    attempt_type text DEFAULT 'email'::text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    last_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fingerprint text
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    subscribed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_confirmation boolean DEFAULT true NOT NULL,
    order_shipped boolean DEFAULT true NOT NULL,
    order_delivered boolean DEFAULT true NOT NULL,
    marketing_emails boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['order_confirmation'::text, 'order_shipped'::text, 'order_delivered'::text, 'return_approved'::text, 'low_stock'::text])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    size text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    shipping_address_line1 text NOT NULL,
    shipping_address_line2 text,
    shipping_city text NOT NULL,
    shipping_state text NOT NULL,
    shipping_postal_code text NOT NULL,
    shipping_country text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_method_id uuid,
    discount_code_id uuid,
    discount_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    shipping_cost numeric DEFAULT 0,
    subtotal numeric,
    notes text,
    tracking_number text,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.orders REPLICA IDENTITY FULL;


--
-- Name: otp_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    otp_type text NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    first_request_at timestamp with time zone DEFAULT now() NOT NULL,
    last_request_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fingerprint text
);


--
-- Name: product_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    alt_text text,
    "position" integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    size text,
    color text,
    stock integer DEFAULT 0 NOT NULL,
    price_adjustment numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_variants_stock_check CHECK ((stock >= 0))
);


--
-- Name: product_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    category text NOT NULL,
    image_url text,
    stock integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false,
    is_new_arrival boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sale_price numeric,
    sale_ends_at timestamp with time zone,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);

ALTER TABLE ONLY public.products REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    phone text,
    full_name text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_request_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: return_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reason text NOT NULL,
    refund_amount numeric,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT return_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rating_range_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT review_text_length_check CHECK (((review_text IS NULL) OR (length(review_text) <= 2000))),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    tracking_number text,
    carrier text,
    shipping_method_id uuid,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shipments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'in_transit'::text, 'delivered'::text, 'failed'::text])))
);


--
-- Name: shipping_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    base_cost numeric NOT NULL,
    estimated_days_min integer,
    estimated_days_max integer,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tax_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country text NOT NULL,
    state text,
    rate numeric NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_2fa_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_2fa_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_2fa_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_2fa_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: abandoned_cart_emails abandoned_cart_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abandoned_cart_emails
    ADD CONSTRAINT abandoned_cart_emails_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_product_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_product_id_variant_id_key UNIQUE (user_id, product_id, variant_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: collections collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_slug_key UNIQUE (slug);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: discount_code_products discount_code_products_discount_code_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_products
    ADD CONSTRAINT discount_code_products_discount_code_id_product_id_key UNIQUE (discount_code_id, product_id);


--
-- Name: discount_code_products discount_code_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_products
    ADD CONSTRAINT discount_code_products_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_verification_codes email_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: gift_card_transactions gift_card_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_pkey PRIMARY KEY (id);


--
-- Name: gift_cards gift_cards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_code_key UNIQUE (code);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustments inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_identifier_key UNIQUE (identifier);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_rate_limits otp_rate_limits_identifier_otp_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_rate_limits
    ADD CONSTRAINT otp_rate_limits_identifier_otp_type_key UNIQUE (identifier, otp_type);


--
-- Name: otp_rate_limits otp_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_rate_limits
    ADD CONSTRAINT otp_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: product_collections product_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_collections
    ADD CONSTRAINT product_collections_pkey PRIMARY KEY (id);


--
-- Name: product_collections product_collections_product_id_collection_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_collections
    ADD CONSTRAINT product_collections_product_id_collection_id_key UNIQUE (product_id, collection_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_product_id_size_color_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_size_color_key UNIQUE (product_id, size, color);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: return_items return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);


--
-- Name: return_requests return_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipping_methods shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: tax_rates tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (id);


--
-- Name: user_2fa_codes user_2fa_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa_codes
    ADD CONSTRAINT user_2fa_codes_pkey PRIMARY KEY (id);


--
-- Name: user_2fa_settings user_2fa_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa_settings
    ADD CONSTRAINT user_2fa_settings_pkey PRIMARY KEY (id);


--
-- Name: user_2fa_settings user_2fa_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa_settings
    ADD CONSTRAINT user_2fa_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_abandoned_cart_emails_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abandoned_cart_emails_sent_at ON public.abandoned_cart_emails USING btree (email_sent_at);


--
-- Name: idx_abandoned_cart_emails_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abandoned_cart_emails_user_id ON public.abandoned_cart_emails USING btree (user_id);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category);


--
-- Name: idx_blog_posts_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published ON public.blog_posts USING btree (published, published_at);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_updated_at ON public.cart_items USING btree (updated_at DESC);


--
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- Name: idx_cart_items_user_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_updated ON public.cart_items USING btree (user_id, updated_at DESC);


--
-- Name: idx_email_verification_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_codes_email ON public.email_verification_codes USING btree (email);


--
-- Name: idx_email_verification_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verification_codes_expires ON public.email_verification_codes USING btree (expires_at);


--
-- Name: idx_favorites_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_product_id ON public.favorites USING btree (product_id);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_favorites_user_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_product ON public.favorites USING btree (user_id, product_id);


--
-- Name: idx_login_attempts_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_blocked ON public.login_attempts USING btree (blocked_until) WHERE (blocked_until IS NOT NULL);


--
-- Name: idx_login_attempts_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_fingerprint ON public.login_attempts USING btree (fingerprint);


--
-- Name: idx_login_attempts_fingerprint_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_fingerprint_type ON public.login_attempts USING btree (fingerprint, attempt_type);


--
-- Name: idx_login_attempts_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_identifier ON public.login_attempts USING btree (identifier, attempt_type);


--
-- Name: idx_login_attempts_identifier_last_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_identifier_last_attempt ON public.login_attempts USING btree (identifier, last_attempt_at);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_created ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_status ON public.orders USING btree (user_id, status);


--
-- Name: idx_otp_rate_limits_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_rate_limits_blocked ON public.otp_rate_limits USING btree (blocked_until) WHERE (blocked_until IS NOT NULL);


--
-- Name: idx_otp_rate_limits_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_rate_limits_fingerprint ON public.otp_rate_limits USING btree (fingerprint);


--
-- Name: idx_otp_rate_limits_fingerprint_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_rate_limits_fingerprint_type ON public.otp_rate_limits USING btree (fingerprint, otp_type);


--
-- Name: idx_otp_rate_limits_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_rate_limits_identifier ON public.otp_rate_limits USING btree (identifier, otp_type);


--
-- Name: idx_otp_rate_limits_identifier_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_rate_limits_identifier_type ON public.otp_rate_limits USING btree (identifier, otp_type);


--
-- Name: idx_product_images_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_position ON public.product_images USING btree (product_id, "position");


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variants_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_stock ON public.product_variants USING btree (stock);


--
-- Name: idx_product_views_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
-- Name: idx_product_views_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_session_id ON public.product_views USING btree (session_id);


--
-- Name: idx_product_views_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_user_id ON public.product_views USING btree (user_id);


--
-- Name: idx_product_views_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_viewed_at ON public.product_views USING btree (viewed_at);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_category_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_created ON public.products USING btree (category, created_at DESC);


--
-- Name: idx_products_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at DESC);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_products_featured_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured_created ON public.products USING btree (is_featured, created_at DESC) WHERE (is_featured = true);


--
-- Name: idx_products_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_featured ON public.products USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_products_is_new_arrival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_new_arrival ON public.products USING btree (is_new_arrival) WHERE (is_new_arrival = true);


--
-- Name: idx_products_new_arrival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_new_arrival ON public.products USING btree (is_new_arrival) WHERE (is_new_arrival = true);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_price ON public.products USING btree (price);


--
-- Name: idx_products_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_stock ON public.products USING btree (stock);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at DESC);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_user_2fa_codes_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_2fa_codes_expires_at ON public.user_2fa_codes USING btree (expires_at);


--
-- Name: idx_user_2fa_codes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_2fa_codes_user_id ON public.user_2fa_codes USING btree (user_id);


--
-- Name: idx_user_2fa_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_2fa_settings_user_id ON public.user_2fa_settings USING btree (user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: orders trigger_send_order_status_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_send_order_status_email AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.send_order_status_email();


--
-- Name: user_2fa_settings update_2fa_settings_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_2fa_settings_timestamp BEFORE UPDATE ON public.user_2fa_settings FOR EACH ROW EXECUTE FUNCTION public.update_2fa_settings_updated_at();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_codes update_discount_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_templates update_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_applications update_job_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_postings update_job_postings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: return_requests update_return_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_return_requests_updated_at BEFORE UPDATE ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipments update_shipments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts validate_blog_content_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_blog_content_trigger BEFORE INSERT OR UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.validate_blog_content_size();


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discount_code_products discount_code_products_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_products
    ADD CONSTRAINT discount_code_products_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE CASCADE;


--
-- Name: discount_code_products discount_code_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_products
    ADD CONSTRAINT discount_code_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: email_templates email_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_2fa_codes fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa_codes
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_2fa_settings fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_2fa_settings
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gift_card_transactions gift_card_transactions_gift_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_gift_card_id_fkey FOREIGN KEY (gift_card_id) REFERENCES public.gift_cards(id) ON DELETE CASCADE;


--
-- Name: gift_card_transactions gift_card_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_transactions
    ADD CONSTRAINT gift_card_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: gift_cards gift_cards_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id);


--
-- Name: inventory_adjustments inventory_adjustments_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);


--
-- Name: inventory_adjustments inventory_adjustments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id);


--
-- Name: orders orders_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: product_collections product_collections_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_collections
    ADD CONSTRAINT product_collections_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: product_collections product_collections_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_collections
    ADD CONSTRAINT product_collections_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: return_items return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: return_items return_items_return_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_return_request_id_fkey FOREIGN KEY (return_request_id) REFERENCES public.return_requests(id) ON DELETE CASCADE;


--
-- Name: return_requests return_requests_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: return_requests return_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: return_requests Admin can manage all return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage all return requests" ON public.return_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_adjustments Admins can create inventory adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create inventory adjustments" ON public.inventory_adjustments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can manage all blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all blog posts" ON public.blog_posts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_applications Admins can manage all job applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all job applications" ON public.job_applications USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_postings Admins can manage all job postings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all job postings" ON public.job_postings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Admins can manage all newsletter subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all newsletter subscribers" ON public.newsletter_subscribers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can manage all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notifications" ON public.notifications USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: return_items Admins can manage all return items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all return items" ON public.return_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: return_requests Admins can manage all return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all return requests" ON public.return_requests USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: collections Admins can manage collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage collections" ON public.collections USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discount_code_products Admins can manage discount code products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage discount code products" ON public.discount_code_products TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discount_codes Admins can manage discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_templates Admins can manage email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage email templates" ON public.email_templates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: gift_card_transactions Admins can manage gift card transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage gift card transactions" ON public.gift_card_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: gift_cards Admins can manage gift cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage gift cards" ON public.gift_cards USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_collections Admins can manage product collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product collections" ON public.product_collections USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_images Admins can manage product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product images" ON public.product_images USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins can manage product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product variants" ON public.product_variants USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipments Admins can manage shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipments" ON public.shipments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_methods Admins can manage shipping methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping methods" ON public.shipping_methods USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tax_rates Admins can manage tax rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tax rates" ON public.tax_rates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins can update any order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any order" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_preferences Admins can update notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update notification preferences" ON public.notification_preferences FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: abandoned_cart_emails Admins can view abandoned cart emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view abandoned cart emails" ON public.abandoned_cart_emails FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_2fa_settings Admins can view all 2FA settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all 2FA settings" ON public.user_2fa_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_addresses Admins can view all addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all addresses" ON public.customer_addresses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cart_items Admins can view all cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all cart items" ON public.cart_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: favorites Admins can view all favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all favorites" ON public.favorites FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_adjustments Admins can view all inventory adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all inventory adjustments" ON public.inventory_adjustments FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_preferences Admins can view all notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all notification preferences" ON public.notification_preferences FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_items Admins can view all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Admins can view all subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_views Anyone can insert product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert product views" ON public.product_views FOR INSERT WITH CHECK (true);


--
-- Name: job_applications Anyone can submit job applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit job applications" ON public.job_applications FOR INSERT WITH CHECK (true);


--
-- Name: newsletter_subscribers Anyone can subscribe to newsletter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: categories Anyone can view active categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING ((active = true));


--
-- Name: collections Anyone can view active collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active collections" ON public.collections FOR SELECT USING ((active = true));


--
-- Name: discount_codes Anyone can view active discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes FOR SELECT USING ((active = true));


--
-- Name: job_postings Anyone can view active job postings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active job postings" ON public.job_postings FOR SELECT USING ((active = true));


--
-- Name: shipping_methods Anyone can view active shipping methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active shipping methods" ON public.shipping_methods FOR SELECT USING ((active = true));


--
-- Name: tax_rates Anyone can view active tax rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active tax rates" ON public.tax_rates FOR SELECT USING ((active = true));


--
-- Name: discount_code_products Anyone can view discount code products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view discount code products" ON public.discount_code_products FOR SELECT USING (true);


--
-- Name: product_collections Anyone can view product collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product collections" ON public.product_collections FOR SELECT USING (true);


--
-- Name: product_images Anyone can view product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);


--
-- Name: product_variants Anyone can view product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product variants" ON public.product_variants FOR SELECT USING (true);


--
-- Name: products Anyone can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);


--
-- Name: blog_posts Anyone can view published blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING ((published = true));


--
-- Name: reviews Anyone can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);


--
-- Name: user_2fa_codes Only admins can manage 2FA codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage 2FA codes" ON public.user_2fa_codes TO authenticated USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: otp_rate_limits Only admins can view OTP rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view OTP rate limits" ON public.otp_rate_limits USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_applications Only admins can view job applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view job applications" ON public.job_applications FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: login_attempts Only admins can view login attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view login attempts" ON public.login_attempts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Only admins can view newsletter subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view newsletter subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cart_items Require authentication for all cart_items operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all cart_items operations" ON public.cart_items TO authenticated USING (true) WITH CHECK (true);


--
-- Name: customer_addresses Require authentication for all customer_addresses operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all customer_addresses operations" ON public.customer_addresses TO authenticated USING (true) WITH CHECK (true);


--
-- Name: favorites Require authentication for all favorites operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all favorites operations" ON public.favorites TO authenticated USING (true) WITH CHECK (true);


--
-- Name: notification_preferences Require authentication for all notification_preferences operati; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all notification_preferences operati" ON public.notification_preferences TO authenticated USING (true) WITH CHECK (true);


--
-- Name: notifications Require authentication for all notifications operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all notifications operations" ON public.notifications TO authenticated USING (true) WITH CHECK (true);


--
-- Name: orders Require authentication for all orders operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all orders operations" ON public.orders TO authenticated USING (true) WITH CHECK (true);


--
-- Name: profiles Require authentication for all profile operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all profile operations" ON public.profiles TO authenticated USING (true) WITH CHECK (true);


--
-- Name: reviews Require authentication for all reviews operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all reviews operations" ON public.reviews TO authenticated USING (true) WITH CHECK (true);


--
-- Name: user_2fa_settings Require authentication for all user_2fa_settings operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for all user_2fa_settings operations" ON public.user_2fa_settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: user_2fa_codes Service can insert 2FA codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert 2FA codes" ON public.user_2fa_codes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: abandoned_cart_emails System can create abandoned cart emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create abandoned cart emails" ON public.abandoned_cart_emails FOR INSERT WITH CHECK (true);


--
-- Name: notifications System can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: login_attempts System can insert login attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert login attempts" ON public.login_attempts FOR INSERT WITH CHECK (true);


--
-- Name: otp_rate_limits System can manage OTP rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage OTP rate limits" ON public.otp_rate_limits FOR INSERT WITH CHECK (true);


--
-- Name: email_verification_codes System can manage verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage verification codes" ON public.email_verification_codes USING (true) WITH CHECK (true);


--
-- Name: otp_rate_limits System can update OTP rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update OTP rate limits" ON public.otp_rate_limits FOR UPDATE USING (true);


--
-- Name: favorites Users can add favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: cart_items Users can add to their cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to their cart" ON public.cart_items FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: orders Users can cancel pending orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can cancel pending orders" ON public.orders FOR UPDATE USING ((public.is_owner(user_id) AND (status = 'pending'::text))) WITH CHECK ((public.is_owner(user_id) AND (status = ANY (ARRAY['pending'::text, 'cancelled'::text]))));


--
-- Name: return_requests Users can create own return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own return requests" ON public.return_requests FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND public.is_owner(user_id)));


--
-- Name: return_items Users can create return items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create return items" ON public.return_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.return_requests
  WHERE ((return_requests.id = return_items.return_request_id) AND public.is_owner(return_requests.user_id)))));


--
-- Name: return_requests Users can create return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create return requests" ON public.return_requests FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: reviews Users can create reviews for purchased products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reviews for purchased products" ON public.reviews FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: order_items Users can create their own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND public.is_owner(orders.user_id)))));


--
-- Name: orders Users can create their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: user_2fa_codes Users can delete expired codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete expired codes" ON public.user_2fa_codes FOR DELETE TO authenticated USING (((auth.uid() IS NOT NULL) AND public.is_owner(user_id)));


--
-- Name: cart_items Users can delete from their cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete from their cart" ON public.cart_items FOR DELETE USING (public.is_owner(user_id));


--
-- Name: user_2fa_settings Users can delete their own 2FA settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own 2FA settings" ON public.user_2fa_settings FOR DELETE USING (public.is_owner(user_id));


--
-- Name: customer_addresses Users can delete their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own addresses" ON public.customer_addresses FOR DELETE USING (public.is_owner(user_id));


--
-- Name: reviews Users can delete their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (public.is_owner(user_id));


--
-- Name: user_2fa_settings Users can insert their own 2FA settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own 2FA settings" ON public.user_2fa_settings FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: customer_addresses Users can insert their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own addresses" ON public.customer_addresses FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: notification_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (public.is_owner(user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (public.is_owner(id));


--
-- Name: favorites Users can remove favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (public.is_owner(user_id));


--
-- Name: return_requests Users can update own return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own return requests" ON public.return_requests FOR UPDATE TO authenticated USING (((auth.uid() IS NOT NULL) AND public.is_owner(user_id))) WITH CHECK (((auth.uid() IS NOT NULL) AND public.is_owner(user_id)));


--
-- Name: cart_items Users can update their cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their cart" ON public.cart_items FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: user_2fa_settings Users can update their own 2FA settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own 2FA settings" ON public.user_2fa_settings FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: customer_addresses Users can update their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own addresses" ON public.customer_addresses FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (public.is_owner(id));


--
-- Name: reviews Users can update their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (public.is_owner(user_id));


--
-- Name: user_2fa_codes Users can validate their own codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can validate their own codes" ON public.user_2fa_codes FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND public.is_owner(user_id) AND (expires_at > now()) AND (verified = false)));


--
-- Name: return_requests Users can view own return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own return requests" ON public.return_requests FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND public.is_owner(user_id)));


--
-- Name: gift_cards Users can view their gift cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their gift cards" ON public.gift_cards FOR SELECT USING ((public.is_owner(sender_user_id) OR (recipient_email = (auth.jwt() ->> 'email'::text)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: shipments Users can view their order shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their order shipments" ON public.shipments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = shipments.order_id) AND public.is_owner(orders.user_id)))));


--
-- Name: user_2fa_settings Users can view their own 2FA settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own 2FA settings" ON public.user_2fa_settings FOR SELECT USING (public.is_owner(user_id));


--
-- Name: customer_addresses Users can view their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own addresses" ON public.customer_addresses FOR SELECT USING (public.is_owner(user_id));


--
-- Name: cart_items Users can view their own cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cart" ON public.cart_items FOR SELECT USING (public.is_owner(user_id));


--
-- Name: favorites Users can view their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (public.is_owner(user_id));


--
-- Name: gift_card_transactions Users can view their own gift card transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own gift card transactions" ON public.gift_card_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.gift_cards
  WHERE ((gift_cards.id = gift_card_transactions.gift_card_id) AND (public.is_owner(gift_cards.sender_user_id) OR (gift_cards.recipient_email = (auth.jwt() ->> 'email'::text)))))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (public.is_owner(user_id));


--
-- Name: order_items Users can view their own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND public.is_owner(orders.user_id)))));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING ((public.is_owner(user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (public.is_owner(user_id));


--
-- Name: product_views Users can view their own product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own product views" ON public.product_views FOR SELECT USING ((public.is_owner(user_id) OR (user_id IS NULL)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (public.is_owner(id));


--
-- Name: return_items Users can view their own return items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own return items" ON public.return_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.return_requests
  WHERE ((return_requests.id = return_items.return_request_id) AND public.is_owner(return_requests.user_id)))));


--
-- Name: return_requests Users can view their own return requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own return requests" ON public.return_requests FOR SELECT USING (public.is_owner(user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (public.is_owner(user_id));


--
-- Name: abandoned_cart_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.abandoned_cart_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_code_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_code_products ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_card_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: job_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: job_postings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: product_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: product_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: return_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

--
-- Name: return_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_2fa_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_2fa_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_2fa_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;