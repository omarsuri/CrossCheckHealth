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

async function fetchComparisonItems(comparisonId: string) {
  return supabaseAdmin
    .from("saved_product_comparison_items")
    .select(
      `
        *,
        products(${PRODUCT_SELECT})
      `,
    )
    .eq("comparison_id", comparisonId)
    .order("created_at", { ascending: true });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const { data: comparison, error: comparisonError } = await supabaseAdmin
      .from("saved_product_comparisons")
      .select("*")
      .eq("id", id)
      .single();

    if (comparisonError || !comparison) {
      console.error("Saved product comparison detail fetch failure:", comparisonError);
      return errorResponse("Saved product comparison not found", 404, comparisonError);
    }

    const { data: items, error: itemsError } = await fetchComparisonItems(id);

    if (itemsError) {
      console.error("Saved product comparison detail items fetch failure:", itemsError);
      return errorResponse("Failed to fetch saved product comparison items", 500, itemsError);
    }

    return successResponse({
      ...comparison,
      items: (items ?? []).map((item) => ({
        ...item,
        products: item.products ? normalizeProduct(item.products) : item.products,
      })),
    });
  } catch (err) {
    console.error("Saved product comparison detail route error:", err);
    return errorResponse("Something went wrong while fetching the saved product comparison", 500, err);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("saved_product_comparisons")
      .delete()
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Saved product comparison delete failure:", error);
      return errorResponse("Failed to delete saved product comparison", 404, error);
    }

    return successResponse({
      deleted: true,
      comparison: data,
    });
  } catch (err) {
    console.error("Saved product comparison delete route error:", err);
    return errorResponse("Something went wrong while deleting the saved product comparison", 500, err);
  }
}
