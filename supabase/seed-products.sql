create extension if not exists "pgcrypto";

insert into product_categories (name, slug)
values
  ('Heart Health', 'heart'),
  ('Fitness Nutrition', 'fitness'),
  ('Daily Wellness', 'wellness'),
  ('Hydration', 'hydration'),
  ('Digestive Health', 'digestion')
on conflict (slug) do nothing;

with category as (
  select id from product_categories where slug = 'heart'
),
product as (
  insert into products (
    name,
    brand,
    category_id,
    category,
    cat,
    subcategory,
    form,
    diet_type,
    price,
    original_price,
    currency,
    rating,
    review_count,
    fssai_verified,
    affiliate_url,
    image_url,
    is_active
  )
  select
    'Omega-3 Fish Oil 1000mg',
    'HealthFirst',
    category.id,
    'Heart Health',
    'heart',
    'Softgel',
    'softgel',
    'nonveg',
    649,
    799,
    'INR',
    4.3,
    1240,
    true,
    'https://example.com/affiliate/omega-3',
    null,
    true
  from category
  returning id
),
score as (
  insert into product_scores (
    product_id,
    science_score,
    value_score,
    safety_score,
    parent_score,
    transparency_score,
    efficacy_score,
    hype_score,
    overall_score,
    verdict,
    verdict_key,
    verdict_text
  )
  select
    id,
    80,
    85,
    85,
    75,
    80,
    80,
    25,
    82,
    'Worth Buying',
    'yes',
    'Useful omega-3 option when the label clearly states EPA and DHA amounts.'
  from product
)
insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level)
select id, 'EPA', '300 mg', 'eff', 'moderate' from product
union all
select id, 'DHA', '200 mg', 'eff', 'moderate' from product
union all
select id, 'Vitamin E', '10 IU', 'fil', 'supporting' from product;

with category as (
  select id from product_categories where slug = 'fitness'
),
product as (
  insert into products (
    name,
    brand,
    category_id,
    category,
    cat,
    subcategory,
    form,
    diet_type,
    price,
    original_price,
    currency,
    rating,
    review_count,
    fssai_verified,
    affiliate_url,
    image_url,
    is_active
  )
  select
    'Clean Whey Protein Vanilla',
    'NutriCore',
    category.id,
    'Fitness Nutrition',
    'fitness',
    'Powder',
    'powder',
    'veg',
    1899,
    2199,
    'INR',
    4.4,
    2310,
    true,
    'https://example.com/affiliate/clean-whey',
    null,
    true
  from category
  returning id
),
score as (
  insert into product_scores (
    product_id,
    science_score,
    value_score,
    safety_score,
    parent_score,
    transparency_score,
    efficacy_score,
    hype_score,
    overall_score,
    verdict,
    verdict_key,
    verdict_text
  )
  select
    id,
    85,
    80,
    80,
    60,
    85,
    85,
    30,
    82,
    'Worth Buying',
    'yes',
    'Straightforward protein powder with transparent macros and ingredient listing.'
  from product
),
ingredients as (
  insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level)
  select id, 'Whey Protein Concentrate', '24 g protein per serving', 'eff', 'strong' from product
  union all
  select id, 'Cocoa/Vanilla Flavour', 'label declared', 'fil', 'supporting' from product
  union all
  select id, 'Digestive Enzyme Blend', '50 mg', 'und', 'limited' from product
)
insert into product_warnings (product_id, warning_title, warning_text, severity)
select
  id,
  'Allergen Notice',
  'Contains milk ingredients. Not suitable for people with dairy allergy.',
  'medium'
from product;

-- Reference-style product presentation fields used by the SwasthyaSathi comparison UI.
update products
set
  price_unit = ' / 60 softgels',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = false,
  safe_for_elderly = true,
  diet_label = 'Non-Veg',
  verdict = 'Worth Buying',
  interpretation = 'Useful omega-3 option when the label clearly states EPA and DHA amounts.',
  practical_take = 'Useful for people with low fish intake. Compare EPA and DHA totals rather than only bottle strength.',
  usp_headline = 'Transparent EPA and DHA label',
  usp_context = 'A simple omega-3 demo product with declared actives and moderate evidence notes.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Non-Veg", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'EPA and DHA are commonly studied omega-3 fatty acids; this demo record lists declared amounts only.',
  consumer_transparency = 'EPA and DHA amounts are separated on the label, making comparison easier.',
  wellness_context = 'Preventive product guidance only; not a disease treatment recommendation.',
  exposure_interpretation = 'No high-severity warning is attached in this demo data.',
  evidence_strength = 'Moderate evidence'
where name = 'Omega-3 Fish Oil 1000mg';

update products
set
  price_unit = ' / 1 kg',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = true,
  safe_for_elderly = false,
  diet_label = 'Vegetarian',
  verdict = 'Compare First',
  interpretation = 'Straightforward protein powder with transparent macros and ingredient listing.',
  practical_take = 'Compare protein per serving, allergen notes, and total cost per serving before buying.',
  usp_headline = 'Transparent protein-per-serving label',
  usp_context = 'A demo protein product where allergen context matters as much as score.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Vegetarian"]'::jsonb,
  ingredient_research = 'Whey protein is a common protein supplement; this record does not make therapeutic claims.',
  consumer_transparency = 'Protein amount is clearly listed per serving in the demo record.',
  wellness_context = 'Useful only when dietary protein intake needs support.',
  exposure_interpretation = 'Contains milk ingredients; people with dairy allergy should avoid.',
  evidence_strength = 'Strong ingredient evidence'
where name = 'Clean Whey Protein Vanilla';

update products
set
  price_unit = ' / 60 tablets',
  is_fssai_certified = true,
  is_sugar_free = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Compare First',
  interpretation = 'Reasonable daily micronutrient support when diet quality is inconsistent.',
  practical_take = 'Check overlap with other supplements so the same vitamins are not stacked unnecessarily.',
  usp_headline = 'Simple daily micronutrient support',
  usp_context = 'A demo multivitamin profile focused on label transparency and duplication cautions.',
  certifications = '["FSSAI Certified"]'::jsonb,
  chips = '["FSSAI Certified", "Vegetarian", "Sugar Free", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Common micronutrients are listed with declared amounts; suitability depends on diet and context.',
  consumer_transparency = 'Key vitamins and minerals are itemized in the demo ingredient table.',
  wellness_context = 'General wellness support only; not a replacement for dietary care.',
  exposure_interpretation = 'Avoid duplicating the same vitamins from multiple products.',
  evidence_strength = 'Moderate evidence'
where name = 'Daily Essentials Multivitamin';

update products
set
  price_unit = ' / 20 sachets',
  is_fssai_certified = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Worth Buying',
  interpretation = 'Electrolyte mix with a clear label for routine hydration contexts.',
  practical_take = 'Useful when sweat loss is high. People monitoring sugar should compare carbohydrate content.',
  usp_headline = 'Clear electrolyte format',
  usp_context = 'A demo hydration product with transparent electrolyte positioning.',
  certifications = '["FSSAI Certified"]'::jsonb,
  chips = '["FSSAI Certified", "Vegetarian", "Drink Format", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Electrolytes support fluid balance; this record does not imply disease treatment.',
  consumer_transparency = 'Electrolyte format and serving count are clear in the demo data.',
  wellness_context = 'Best understood as hydration support during heat, activity, or travel.',
  exposure_interpretation = 'Review sugar content when comparing similar products.',
  evidence_strength = 'Moderate evidence'
where name = 'Electrolyte Hydration Mix';

update products
set
  price_unit = ' / 30 servings',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Worth Buying',
  interpretation = 'Good-value soluble fiber supplement with a simple ingredient profile.',
  practical_take = 'Take with enough water and start gradually to reduce digestive discomfort.',
  usp_headline = 'Simple soluble fiber',
  usp_context = 'A demo digestive product with a narrow ingredient list and clear use context.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Vegetarian", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Psyllium is a commonly studied soluble fiber; this demo avoids treatment claims.',
  consumer_transparency = 'Single active ingredient and serving amount are clear.',
  wellness_context = 'Digestive wellness support only; not a substitute for clinical care.',
  exposure_interpretation = 'Water intake matters with psyllium fiber products.',
  evidence_strength = 'Strong ingredient evidence'
where name = 'Psyllium Husk Fiber';

update product_scores
set family_safety_score = parent_score
where family_safety_score = 0 or family_safety_score is null;

update product_ingredients
set ingredient_type = case
    when ingredient_name ilike any(array['%EPA%', '%DHA%']) then 'Omega-3 fatty acid'
    when ingredient_name ilike any(array['%Protein%', '%Whey%']) then 'Protein source'
    when ingredient_name ilike any(array['%Vitamin%', '%Zinc%', '%Folic%']) then 'Micronutrient'
    when ingredient_name ilike any(array['%Electrolyte%', '%Sodium%', '%Potassium%']) then 'Electrolyte'
    when ingredient_name ilike any(array['%Psyllium%', '%Fiber%']) then 'Soluble fiber'
    else 'Ingredient'
  end,
  microcopy = coalesce('Evidence: ' || evidence_level, 'Evidence not available');

insert into product_tags (product_id, label, tag_type)
select id, tag.label, tag.tag_type
from products
cross join lateral (
  values
    ('Demo Data', 'context'),
    (case when is_fssai_certified then 'FSSAI Certified' end, 'certification'),
    (case when is_lab_tested then 'Lab Tested' end, 'certification'),
    (case when is_vegetarian then 'Vegetarian' end, 'diet'),
    (case when is_sugar_free then 'Sugar Free' end, 'diet'),
    (case when safe_for_elderly then 'Safe for Elderly' end, 'family')
) as tag(label, tag_type)
where tag.label is not null
on conflict (product_id, label) do nothing;

with category as (
  select id from product_categories where slug = 'wellness'
),
product as (
  insert into products (
    name,
    brand,
    category_id,
    category,
    cat,
    subcategory,
    form,
    diet_type,
    price,
    original_price,
    currency,
    rating,
    review_count,
    fssai_verified,
    affiliate_url,
    image_url,
    is_active
  )
  select
    'Daily Essentials Multivitamin',
    'WellnessLab',
    category.id,
    'Daily Wellness',
    'wellness',
    'Tablet',
    'tablet',
    'veg',
    549,
    699,
    'INR',
    4.1,
    980,
    true,
    'https://example.com/affiliate/multivitamin',
    null,
    true
  from category
  returning id
),
score as (
  insert into product_scores (
    product_id,
    science_score,
    value_score,
    safety_score,
    parent_score,
    transparency_score,
    efficacy_score,
    hype_score,
    overall_score,
    verdict,
    verdict_key,
    verdict_text
  )
  select
    id,
    70,
    75,
    85,
    75,
    75,
    70,
    35,
    75,
    'Conditional',
    'conditional',
    'Reasonable daily micronutrient support when diet quality is inconsistent.'
  from product
),
ingredients as (
  insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level)
  select id, 'Vitamin D3', '400 IU', 'eff', 'moderate' from product
  union all
  select id, 'Vitamin B12', '100 mcg', 'eff', 'moderate' from product
  union all
  select id, 'Zinc', '10 mg', 'eff', 'moderate' from product
  union all
  select id, 'Folic Acid', '200 mcg', 'eff', 'moderate' from product
)
insert into product_warnings (product_id, warning_title, warning_text, severity)
select
  id,
  'Avoid Duplicating Supplements',
  'Check other supplements you take to avoid stacking the same vitamins or minerals.',
  'low'
from product;

with category as (
  select id from product_categories where slug = 'hydration'
),
product as (
  insert into products (
    name,
    brand,
    category_id,
    category,
    cat,
    subcategory,
    form,
    diet_type,
    price,
    original_price,
    currency,
    rating,
    review_count,
    fssai_verified,
    affiliate_url,
    image_url,
    is_active
  )
  select
    'ORS Electrolyte Drink Mix',
    'HydraPlus',
    category.id,
    'Hydration',
    'hydration',
    'Powder',
    'powder',
    'veg',
    299,
    349,
    'INR',
    4.5,
    1780,
    true,
    'https://example.com/affiliate/electrolyte-drink',
    null,
    true
  from category
  returning id
),
score as (
  insert into product_scores (
    product_id,
    science_score,
    value_score,
    safety_score,
    parent_score,
    transparency_score,
    efficacy_score,
    hype_score,
    overall_score,
    verdict,
    verdict_key,
    verdict_text
  )
  select
    id,
    85,
    90,
    90,
    85,
    85,
    80,
    15,
    86,
    'Worth Buying',
    'yes',
    'Simple electrolyte mix with transparent sodium, potassium, and glucose content.'
  from product
)
insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level)
select id, 'Sodium Chloride', 'label declared', 'eff', 'strong' from product
union all
select id, 'Potassium Chloride', 'label declared', 'eff', 'strong' from product
union all
select id, 'Glucose', 'label declared', 'eff', 'strong' from product
union all
select id, 'Citrate Salts', 'label declared', 'eff', 'moderate' from product;

with category as (
  select id from product_categories where slug = 'digestion'
),
product as (
  insert into products (
    name,
    brand,
    category_id,
    category,
    cat,
    subcategory,
    form,
    diet_type,
    price,
    original_price,
    currency,
    rating,
    review_count,
    fssai_verified,
    affiliate_url,
    image_url,
    is_active
  )
  select
    'Psyllium Husk Fiber',
    'FiberDaily',
    category.id,
    'Digestive Health',
    'digestion',
    'Powder',
    'powder',
    'veg',
    399,
    449,
    'INR',
    4.4,
    1425,
    true,
    'https://example.com/affiliate/psyllium-fiber',
    null,
    true
  from category
  returning id
),
score as (
  insert into product_scores (
    product_id,
    science_score,
    value_score,
    safety_score,
    parent_score,
    transparency_score,
    efficacy_score,
    hype_score,
    overall_score,
    verdict,
    verdict_key,
    verdict_text
  )
  select
    id,
    90,
    90,
    85,
    85,
    90,
    85,
    10,
    88,
    'Worth Buying',
    'yes',
    'Good-value soluble fiber supplement with a simple ingredient profile.'
  from product
),
ingredients as (
  insert into product_ingredients (product_id, ingredient_name, amount, status, evidence_level)
  select id, 'Psyllium Husk', '5 g per serving', 'eff', 'strong' from product
)
insert into product_warnings (product_id, warning_title, warning_text, severity)
select
  id,
  'Take With Water',
  'Mix with enough water and increase intake gradually to reduce digestive discomfort.',
  'medium'
from product;

-- Final reference-style patch after all demo products are inserted.
update products
set
  price_unit = ' / 60 softgels',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = false,
  safe_for_elderly = true,
  diet_label = 'Non-Veg',
  verdict = 'Worth Buying',
  interpretation = 'Useful omega-3 option when the label clearly states EPA and DHA amounts.',
  practical_take = 'Useful for people with low fish intake. Compare EPA and DHA totals rather than only bottle strength.',
  usp_headline = 'Transparent EPA and DHA label',
  usp_context = 'A simple omega-3 demo product with declared actives and moderate evidence notes.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Non-Veg", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'EPA and DHA are commonly studied omega-3 fatty acids; this demo record lists declared amounts only.',
  consumer_transparency = 'EPA and DHA amounts are separated on the label, making comparison easier.',
  wellness_context = 'Preventive product guidance only; not a disease treatment recommendation.',
  exposure_interpretation = 'No high-severity warning is attached in this demo data.',
  evidence_strength = 'Moderate evidence'
where name = 'Omega-3 Fish Oil 1000mg';

update products
set
  price_unit = ' / 1 kg',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = true,
  safe_for_elderly = false,
  diet_label = 'Vegetarian',
  verdict = 'Compare First',
  interpretation = 'Straightforward protein powder with transparent macros and ingredient listing.',
  practical_take = 'Compare protein per serving, allergen notes, and total cost per serving before buying.',
  usp_headline = 'Transparent protein-per-serving label',
  usp_context = 'A demo protein product where allergen context matters as much as score.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Vegetarian"]'::jsonb,
  ingredient_research = 'Whey protein is a common protein supplement; this record does not make therapeutic claims.',
  consumer_transparency = 'Protein amount is clearly listed per serving in the demo record.',
  wellness_context = 'Useful only when dietary protein intake needs support.',
  exposure_interpretation = 'Contains milk ingredients; people with dairy allergy should avoid.',
  evidence_strength = 'Strong ingredient evidence'
where name = 'Clean Whey Protein Vanilla';

update products
set
  price_unit = ' / 60 tablets',
  is_fssai_certified = true,
  is_sugar_free = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Compare First',
  interpretation = 'Reasonable daily micronutrient support when diet quality is inconsistent.',
  practical_take = 'Check overlap with other supplements so the same vitamins are not stacked unnecessarily.',
  usp_headline = 'Simple daily micronutrient support',
  usp_context = 'A demo multivitamin profile focused on label transparency and duplication cautions.',
  certifications = '["FSSAI Certified"]'::jsonb,
  chips = '["FSSAI Certified", "Vegetarian", "Sugar Free", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Common micronutrients are listed with declared amounts; suitability depends on diet and context.',
  consumer_transparency = 'Key vitamins and minerals are itemized in the demo ingredient table.',
  wellness_context = 'General wellness support only; not a replacement for dietary care.',
  exposure_interpretation = 'Avoid duplicating the same vitamins from multiple products.',
  evidence_strength = 'Moderate evidence'
where name = 'Daily Essentials Multivitamin';

update products
set
  price_unit = ' / 20 sachets',
  is_fssai_certified = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Worth Buying',
  interpretation = 'Electrolyte mix with a clear label for routine hydration contexts.',
  practical_take = 'Useful when sweat loss is high. People monitoring sugar should compare carbohydrate content.',
  usp_headline = 'Clear electrolyte format',
  usp_context = 'A demo hydration product with transparent electrolyte positioning.',
  certifications = '["FSSAI Certified"]'::jsonb,
  chips = '["FSSAI Certified", "Vegetarian", "Drink Format", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Electrolytes support fluid balance; this record does not imply disease treatment.',
  consumer_transparency = 'Electrolyte format and serving count are clear in the demo data.',
  wellness_context = 'Best understood as hydration support during heat, activity, or travel.',
  exposure_interpretation = 'Review sugar content when comparing similar products.',
  evidence_strength = 'Moderate evidence'
where name = 'ORS Electrolyte Drink Mix';

update products
set
  price_unit = ' / 30 servings',
  is_fssai_certified = true,
  is_lab_tested = true,
  is_vegetarian = true,
  safe_for_elderly = true,
  diet_label = 'Vegetarian',
  verdict = 'Worth Buying',
  interpretation = 'Good-value soluble fiber supplement with a simple ingredient profile.',
  practical_take = 'Take with enough water and start gradually to reduce digestive discomfort.',
  usp_headline = 'Simple soluble fiber',
  usp_context = 'A demo digestive product with a narrow ingredient list and clear use context.',
  certifications = '["FSSAI Certified", "Lab Tested"]'::jsonb,
  chips = '["FSSAI Certified", "Lab Tested", "Vegetarian", "Safe for Elderly"]'::jsonb,
  ingredient_research = 'Psyllium is a commonly studied soluble fiber; this demo avoids treatment claims.',
  consumer_transparency = 'Single active ingredient and serving amount are clear.',
  wellness_context = 'Digestive wellness support only; not a substitute for clinical care.',
  exposure_interpretation = 'Water intake matters with psyllium fiber products.',
  evidence_strength = 'Strong ingredient evidence'
where name = 'Psyllium Husk Fiber';

update product_scores
set family_safety_score = parent_score
where family_safety_score = 0 or family_safety_score is null;

update product_ingredients
set ingredient_type = case
    when ingredient_name ilike any(array['%EPA%', '%DHA%']) then 'Omega-3 fatty acid'
    when ingredient_name ilike any(array['%Protein%', '%Whey%']) then 'Protein source'
    when ingredient_name ilike any(array['%Vitamin%', '%Zinc%', '%Folic%']) then 'Micronutrient'
    when ingredient_name ilike any(array['%Electrolyte%', '%Sodium%', '%Potassium%']) then 'Electrolyte'
    when ingredient_name ilike any(array['%Psyllium%', '%Fiber%']) then 'Soluble fiber'
    else 'Ingredient'
  end,
  microcopy = coalesce('Evidence: ' || evidence_level, 'Evidence not available');

insert into product_tags (product_id, label, tag_type)
select id, tag.label, tag.tag_type
from products
cross join lateral (
  values
    ('Demo Data', 'context'),
    (case when is_fssai_certified then 'FSSAI Certified' end, 'certification'),
    (case when is_lab_tested then 'Lab Tested' end, 'certification'),
    (case when is_vegetarian then 'Vegetarian' end, 'diet'),
    (case when is_sugar_free then 'Sugar Free' end, 'diet'),
    (case when safe_for_elderly then 'Safe for Elderly' end, 'family')
) as tag(label, tag_type)
where tag.label is not null
on conflict (product_id, label) do nothing;
