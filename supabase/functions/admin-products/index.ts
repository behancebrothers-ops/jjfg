import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const success = (data: unknown, corsHeaders: any, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, corsHeaders: any, status = 400, details?: unknown) =>
  new Response(JSON.stringify({ success: false, error: message, details }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Schema matching actual database structure
const ProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1), // Text field, not FK
  stock: z.number().int().nonnegative().default(0),
  image_url: z.string().optional(),
  is_featured: z.boolean().optional().default(false),
  is_new_arrival: z.boolean().optional().default(false),
});

const UpdateProductSchema = ProductSchema.partial();

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

async function verifyAdminAndGetServiceClient(req: Request): Promise<{ supabase: SupabaseClient; user: any }> {
  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);
  
  if (!authHeader) {
    throw new UnauthorizedError("Missing authorization header");
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError("Invalid authorization format");
  }

  const token = authHeader.substring(7);
  
  if (!token || token.length < 10 || token.length > 5000) {
    throw new UnauthorizedError("Invalid token");
  }

  // Create authenticated client with user's JWT  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  console.log("User authenticated:", !!user);
  
  if (error) {
    console.error("Authentication error:", error);
    throw new UnauthorizedError("Authentication failed");
  }
  
  if (!user) {
    console.error("No user found");
    throw new UnauthorizedError("No user found");
  }

  // Verify admin role
  console.log("Checking admin role");
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  console.log("Role check completed");
  
  if (roleError) {
    console.error("Role check error:", roleError);
    throw new Error(roleError.message);
  }
  if (!roleData) {
    console.error("User is not admin");
    throw new ForbiddenError("Forbidden: Admin access required");
  }

  // Return authenticated client - RLS policies will enforce admin access
  console.log("Admin verified");
  return { supabase, user };
}

async function handleListProducts(supabase: SupabaseClient, corsHeaders: any) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

    if (error) {
      const errorId = crypto.randomUUID();
      console.error(`[${errorId}] Admin products error:`, error);
      throw error;
    }
  return success({ products: data || [] }, corsHeaders);
}

async function handleCreateProduct(supabase: SupabaseClient, body: unknown, corsHeaders: any) {
  const data = ProductSchema.parse(body);
  
  const { data: product, error } = await supabase
    .from("products")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Create product error:", error);
    throw error;
  }
  return success(product, corsHeaders, 201);
}

async function handleUpdateProduct(supabase: SupabaseClient, productId: string, body: unknown, corsHeaders: any) {
  const data = UpdateProductSchema.parse(body);

  const { data: product, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    console.error("Update product error:", error);
    throw error;
  }
  return success(product, corsHeaders);
}

async function handleDeleteProduct(supabase: SupabaseClient, productId: string, corsHeaders: any) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("Delete product error:", error);
    throw error;
  }
  return success({ deleted: true }, corsHeaders);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabase, user } = await verifyAdminAndGetServiceClient(req);
    console.log("Admin user verified");

    // Get action and data from request body
    const body = await req.json();
    const action = body.action || "list";
    const productId = body.id;

    console.log("Action:", action, "Product ID:", productId);

    switch (action) {
      case "list":
        return await handleListProducts(supabase, corsHeaders);
      
      case "create":
        return await handleCreateProduct(supabase, body, corsHeaders);
      
      case "update":
        if (!productId) return fail("Product ID required", corsHeaders, 400);
        return await handleUpdateProduct(supabase, productId, body, corsHeaders);
      
      case "delete":
        if (!productId) return fail("Product ID required", corsHeaders, 400);
        return await handleDeleteProduct(supabase, productId, corsHeaders);
      
      default:
        return fail("Invalid action", corsHeaders, 400);
    }
  } catch (error: any) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Admin Products Error:`, error);

    if (error instanceof z.ZodError) {
      return fail("Invalid product data", corsHeaders, 400);
    }
    if (error instanceof UnauthorizedError) {
      return fail("Authentication required", corsHeaders, 401);
    }
    if (error instanceof ForbiddenError) {
      return fail("Access denied", corsHeaders, 403);
    }

    return fail("Unable to process request", corsHeaders, 500);
  }
});
