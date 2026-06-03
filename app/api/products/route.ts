import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";
import { normalizeProducts } from "@/lib/backend/product-normalizer";

const PRODUCT_SELECT = `
  *,
  product_categories(name, slug),
  product_scores(*),
  product_ingredients(*),
  product_warnings(*)
`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim();
    const category = searchParams.get("category")?.trim();

    let query = supabaseAdmin
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%`);
    }

    if (category && category !== "all") {
      query = query.eq("cat", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Products fetch failure:", error);
      return errorResponse("Failed to fetch products", 500, error);
    }

    return successResponse(normalizeProducts(data ?? []));
  } catch (err) {
    console.error("Products route error:", err);
    return errorResponse("Something went wrong while fetching products", 500, err);
  }
}
