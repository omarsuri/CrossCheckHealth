import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";
import { normalizeProduct } from "@/lib/backend/product-normalizer";

const PRODUCT_SELECT = `
  *,
  product_categories(name, slug),
  product_scores(*),
  product_ingredients(*),
  product_warnings(*)
`;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Product fetch failure:", error);
      return errorResponse("Product not found", 404, error);
    }

    return successResponse(normalizeProduct(data));
  } catch (err) {
    console.error("Product detail route error:", err);
    return errorResponse("Something went wrong while fetching the product", 500, err);
  }
}
