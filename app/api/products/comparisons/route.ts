import { NextRequest } from "next/server";
import { z } from "zod";
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

const comparisonSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required"),
  notes: z.string().trim().optional(),
  product_ids: z.array(z.string().uuid()).min(2, "Select at least 2 products"),
});

async function fetchComparisonItems(comparisonIds: string[]) {
  if (comparisonIds.length === 0) {
    return { data: [], error: null };
  }

  return supabaseAdmin
    .from("saved_product_comparison_items")
    .select(
      `
        *,
        products(${PRODUCT_SELECT})
      `,
    )
    .in("comparison_id", comparisonIds)
    .order("created_at", { ascending: true });
}

function attachItemsToComparisons(comparisons: any[], items: any[]) {
  const itemsByComparisonId = new Map<string, any[]>();

  for (const item of items) {
    const comparisonItems = itemsByComparisonId.get(item.comparison_id) ?? [];
    comparisonItems.push(item);
    itemsByComparisonId.set(item.comparison_id, comparisonItems);
  }

  return comparisons.map((comparison) => ({
      ...comparison,
      items: (itemsByComparisonId.get(comparison.id) ?? []).map((item) => ({
        ...item,
        products: item.products ? normalizeProduct(item.products) : item.products,
      })),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id")?.trim();

    if (!userId) {
      return errorResponse("user_id is required", 400);
    }

    const { data: comparisons, error: comparisonsError } = await supabaseAdmin
      .from("saved_product_comparisons")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (comparisonsError) {
      console.error("Saved product comparisons fetch failure:", comparisonsError);
      return errorResponse("Failed to fetch saved product comparisons", 500, comparisonsError);
    }

    const comparisonRows = comparisons ?? [];
    const comparisonIds = comparisonRows.map((comparison) => comparison.id);
    const { data: items, error: itemsError } = await fetchComparisonItems(comparisonIds);

    if (itemsError) {
      console.error("Saved product comparison items fetch failure:", itemsError);
      return errorResponse("Failed to fetch saved product comparison items", 500, itemsError);
    }

    return successResponse(attachItemsToComparisons(comparisonRows, items ?? []));
  } catch (err) {
    console.error("Saved product comparisons route error:", err);
    return errorResponse("Something went wrong while fetching saved product comparisons", 500, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = comparisonSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid saved product comparison payload", 400, parsed.error.flatten());
    }

    const uniqueProductIds = Array.from(new Set(parsed.data.product_ids));

    if (uniqueProductIds.length < 2) {
      return errorResponse("Select at least 2 unique products", 400);
    }

    const { data: comparison, error: comparisonError } = await supabaseAdmin
      .from("saved_product_comparisons")
      .insert({
        user_id: parsed.data.user_id,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
      })
      .select("*")
      .single();

    if (comparisonError || !comparison) {
      console.error("Saved product comparison insert failure:", comparisonError);
      return errorResponse("Failed to save product comparison", 500, comparisonError);
    }

    const comparisonItems = uniqueProductIds.map((productId) => ({
      comparison_id: comparison.id,
      product_id: productId,
    }));

    const { error: itemsInsertError } = await supabaseAdmin
      .from("saved_product_comparison_items")
      .insert(comparisonItems);

    if (itemsInsertError) {
      console.error("Saved product comparison items insert failure:", itemsInsertError);
      return errorResponse("Failed to save product comparison items", 500, itemsInsertError);
    }

    const { data: items, error: itemsFetchError } = await fetchComparisonItems([comparison.id]);

    if (itemsFetchError) {
      console.error("Saved product comparison items fetch after insert failure:", itemsFetchError);
      return errorResponse("Saved comparison, but failed to fetch comparison items", 500, itemsFetchError);
    }

    return successResponse(
      {
        ...comparison,
        items: (items ?? []).map((item) => ({
          ...item,
          products: item.products ? normalizeProduct(item.products) : item.products,
        })),
      },
      201,
    );
  } catch (err) {
    console.error("Saved product comparison create route error:", err);
    return errorResponse("Something went wrong while saving the product comparison", 500, err);
  }
}
