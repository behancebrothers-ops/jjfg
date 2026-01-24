import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts"

/* ---------------------------- Shared Configuration ---------------------------- */

const success = (data: unknown, corsHeaders: any, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const fail = (message: string, corsHeaders: any, status = 400, details?: unknown) =>
  new Response(JSON.stringify({ success: false, error: message, details }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

/* ------------------------------ Validation Schemas ----------------------------- */

const AdjustInventorySchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  quantity_change: z.number().int().min(-10000).max(10000),
  reason: z.enum(["restock", "damage", "sale", "return", "adjustment", "other"]),
  notes: z.string().max(500).optional(),
})

const BulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      product_id: z.string().uuid(),
      variant_id: z.string().uuid().optional(),
      new_stock: z.number().int().nonnegative().max(1000000),
    }),
  ).max(100, "Maximum 100 updates per request"),
})

/* ----------------------------- Utility Functions ------------------------------ */

async function getSupabaseClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error("Invalid authorization format");
  }

  const token = authHeader.substring(7);
  
  if (!token || token.length < 10 || token.length > 5000) {
    throw new Error("Invalid token");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) throw new Error("Unauthorized")

  // Verify admin role
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle()

  if (roleError || !roleData) throw new Error("Forbidden: Admin access required")

  // Return authenticated client - RLS policies will enforce admin access
  return { supabase, user }
}

/* ------------------------------- Route Handlers ------------------------------- */

async function handleViewInventory(supabase: any, corsHeaders: any, threshold = 10) {
  // Validate threshold
  const validThreshold = Math.min(Math.max(1, threshold), 1000);
  
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, stock, category")
    .lte("stock", validThreshold)
    .order("stock", { ascending: true })
    .limit(100)

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, stock, size, color")
    .lte("stock", validThreshold)
    .order("stock", { ascending: true })
    .limit(100)

  if (productsError || variantsError) throw productsError || variantsError

  return success({
    threshold: validThreshold,
    low_stock_products: products || [],
    low_stock_variants: variants || [],
  }, corsHeaders)
}

async function handleAdjustInventory(supabase: any, user: any, body: unknown, corsHeaders: any) {
  const data = AdjustInventorySchema.parse(body)

  const insert = {
    product_id: data.product_id,
    variant_id: data.variant_id,
    quantity_change: data.quantity_change,
    reason: data.reason,
    notes: data.notes,
    admin_user_id: user.id,
  }

  const { data: adjustment, error } = await supabase
    .from("inventory_adjustments")
    .insert(insert)
    .select()
    .single()

  if (error) throw error

  const targetTable = data.variant_id ? "product_variants" : "products"
  const targetId = data.variant_id || data.product_id

  const { data: target, error: fetchError } = await supabase
    .from(targetTable)
    .select("stock")
    .eq("id", targetId)
    .single()

  if (fetchError) throw fetchError

  const newStock = Math.max(0, target.stock + data.quantity_change)

  const { error: updateError } = await supabase
    .from(targetTable)
    .update({ stock: newStock })
    .eq("id", targetId)

  if (updateError) throw updateError

  console.log(`[ADMIN-INVENTORY] Stock adjusted for ${targetTable}:${targetId} by ${data.quantity_change} to ${newStock}`)

  return success({
    message: `${targetTable === "products" ? "Product" : "Variant"} stock updated.`,
    newStock,
    adjustment,
  }, corsHeaders)
}

async function handleBulkUpdate(supabase: any, user: any, body: unknown, corsHeaders: any) {
  const data = BulkUpdateSchema.parse(body)
  const results: any[] = []

  for (const update of data.updates) {
    try {
      const table = update.variant_id ? "product_variants" : "products"
      const id = update.variant_id || update.product_id

      const { error } = await supabase
        .from(table)
        .update({ stock: update.new_stock })
        .eq("id", id)

      if (error) throw error

      await supabase.from("inventory_adjustments").insert({
        product_id: update.product_id,
        variant_id: update.variant_id,
        quantity_change: 0,
        reason: "adjustment",
        notes: "Bulk inventory update",
        admin_user_id: user.id,
      })

      results.push({ ...update, success: true })
    } catch (e: any) {
      results.push({ ...update, success: false, error: e.message })
    }
  }

  console.log(`[ADMIN-INVENTORY] Bulk update completed: ${results.filter(r => r.success).length}/${results.length} successful`)

  return success({
    message: "Bulk inventory update complete",
    results,
  }, corsHeaders)
}

async function handleHistory(supabase: any, search: URLSearchParams, corsHeaders: any) {
  const productId = search.get("product_id")
  const page = Math.max(1, Math.min(100, parseInt(search.get("page") || "1")))
  const limit = Math.max(1, Math.min(100, parseInt(search.get("limit") || "50")))
  const offset = (page - 1) * limit

  // Validate product_id if provided
  if (productId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error("Invalid product_id format")
  }

  let query = supabase
    .from("inventory_adjustments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (productId) query = query.eq("product_id", productId)

  const { data, count, error } = await query
  if (error) throw error

  return success({
    history: data || [],
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }, corsHeaders)
}

/* -------------------------------- HTTP Server -------------------------------- */

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  try {
    // Rate limit check for admin endpoints
    const rateLimitResult = await checkCombinedRateLimit(req, 'admin-inventory', RATE_LIMITS.AUTH_NORMAL);
    if (!rateLimitResult.allowed) {
      console.log('[ADMIN-INVENTORY] Rate limit exceeded');
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    const { supabase, user } = await getSupabaseClient(req)

    switch (true) {
      case req.method === "GET" && action === "view":
        return await handleViewInventory(supabase, corsHeaders, parseInt(url.searchParams.get("threshold") || "10"))

      case req.method === "POST" && action === "adjust":
        return await handleAdjustInventory(supabase, user, await req.json(), corsHeaders)

      case req.method === "POST" && action === "bulk-update":
        return await handleBulkUpdate(supabase, user, await req.json(), corsHeaders)

      case req.method === "GET" && action === "history":
        return await handleHistory(supabase, url.searchParams, corsHeaders)

      default:
        return fail("Invalid route or method", corsHeaders, 404)
    }
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Admin Inventory Error:`, error)

    if (error instanceof z.ZodError)
      return fail("Invalid adjustment data", corsHeaders, 400)

    if (error.message?.includes("Unauthorized"))
      return fail("Authentication required", corsHeaders, 401)

    if (error.message?.includes("Forbidden"))
      return fail("Access denied", corsHeaders, 403)

    return fail("Unable to process request", corsHeaders, 500)
  }
})
