export interface RetailCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface RetailProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  unit_label: string;
  selling_price: number;
  compare_at_price: number | null;
  image_url: string;
  tags: string[];
  category_id: string;
  category_slug: string;
  category_name: string;
  stock_qty: number | null;
  is_available: boolean;
}

export const RETAIL_CATEGORIES: RetailCategory[] = [
  { id: "11111111-0000-4000-8000-000000000001", slug: "fruits", name: "Fruits", description: "Imported icons and Indian favourites." },
  { id: "11111111-0000-4000-8000-000000000002", slug: "vegetables", name: "Vegetables", description: "Crisp staples and speciality greens." },
  { id: "11111111-0000-4000-8000-000000000003", slug: "bakery", name: "Bakery", description: "Fresh breads and beautiful bakes." },
  { id: "11111111-0000-4000-8000-000000000004", slug: "dairy", name: "Dairy & Eggs", description: "Premium chilled essentials." },
  { id: "11111111-0000-4000-8000-000000000005", slug: "beverages", name: "Juices & Drinks", description: "Cold, clean and ready to pour." },
];

const PRODUCTS: Omit<RetailProduct, "category_slug" | "category_name" | "stock_qty" | "is_available">[] = [
  { id: "22222222-0000-4000-8000-000000000001", sku: "AF-FR-001", category_id: RETAIL_CATEGORIES[0].id, name: "Pink Lady® Apples", description: "Crisp, rosy and naturally balanced between sweetness and acidity.", unit_label: "4 pcs", selling_price: 329, compare_at_price: 369, image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=900&q=85&auto=format&fit=crop", tags: ["Imported", "Bestseller"] },
  { id: "22222222-0000-4000-8000-000000000002", sku: "AF-FR-002", category_id: RETAIL_CATEGORIES[0].id, name: "Shine Muscat Grapes", description: "Fragrant, seedless Japanese-style grapes with a clean snap.", unit_label: "400 g", selling_price: 899, compare_at_price: 999, image_url: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=900&q=85&auto=format&fit=crop", tags: ["Imported", "Premium"] },
  { id: "22222222-0000-4000-8000-000000000003", sku: "AF-FR-003", category_id: RETAIL_CATEGORIES[0].id, name: "Zespri® SunGold Kiwi", description: "Silky golden flesh with tropical sweetness and bright vitamin C.", unit_label: "3 pcs", selling_price: 279, compare_at_price: 319, image_url: "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=900&q=85&auto=format&fit=crop", tags: ["Imported"] },
  { id: "22222222-0000-4000-8000-000000000004", sku: "AF-FR-004", category_id: RETAIL_CATEGORIES[0].id, name: "Driscoll’s® Blueberries", description: "Plump premium berries, cold-chain handled for freshness.", unit_label: "125 g", selling_price: 349, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=900&q=85&auto=format&fit=crop", tags: ["Imported", "Antioxidant"] },
  { id: "22222222-0000-4000-8000-000000000005", sku: "AF-FR-005", category_id: RETAIL_CATEGORIES[0].id, name: "Ratnagiri Alphonso Mango", description: "Origin-sourced, aromatic and deeply golden seasonal mangoes.", unit_label: "2 pcs", selling_price: 399, compare_at_price: 449, image_url: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=900&q=85&auto=format&fit=crop", tags: ["Indian", "Seasonal"] },
  { id: "22222222-0000-4000-8000-000000000006", sku: "AF-FR-006", category_id: RETAIL_CATEGORIES[0].id, name: "Kerala Nendran Banana", description: "A Kerala staple selected for flavour, body and even ripening.", unit_label: "500 g", selling_price: 69, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=900&q=85&auto=format&fit=crop", tags: ["Local"] },
  { id: "22222222-0000-4000-8000-000000000007", sku: "AF-VE-001", category_id: RETAIL_CATEGORIES[1].id, name: "Highland Broccoli", description: "Dense, crisp crowns sourced from cool-climate farms.", unit_label: "1 pc", selling_price: 129, compare_at_price: 149, image_url: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=900&q=85&auto=format&fit=crop", tags: ["Fresh"] },
  { id: "22222222-0000-4000-8000-000000000008", sku: "AF-VE-002", category_id: RETAIL_CATEGORIES[1].id, name: "Cherry Tomatoes", description: "Sweet, firm and colourful—ideal for salads and quick cooking.", unit_label: "250 g", selling_price: 99, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=900&q=85&auto=format&fit=crop", tags: ["Fresh"] },
  { id: "22222222-0000-4000-8000-000000000009", sku: "AF-VE-003", category_id: RETAIL_CATEGORIES[1].id, name: "Romaine Lettuce", description: "Cool, crunchy hearts with clean flavour and excellent shelf life.", unit_label: "1 head", selling_price: 119, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=900&q=85&auto=format&fit=crop", tags: ["Fresh", "Salad"] },
  { id: "22222222-0000-4000-8000-000000000010", sku: "AF-FR-007", category_id: RETAIL_CATEGORIES[0].id, name: "Hass Avocado", description: "Creamy, ready-to-ripen fruit selected for consistent quality.", unit_label: "2 pcs", selling_price: 289, compare_at_price: 329, image_url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=900&q=85&auto=format&fit=crop", tags: ["Imported"] },
  { id: "22222222-0000-4000-8000-000000000011", sku: "AF-BA-001", category_id: RETAIL_CATEGORIES[2].id, name: "Aeden Country Sourdough", description: "Slow-fermented loaf with a burnished crust and open crumb.", unit_label: "500 g loaf", selling_price: 189, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=85&auto=format&fit=crop", tags: ["Bakery"] },
  { id: "22222222-0000-4000-8000-000000000012", sku: "AF-BA-002", category_id: RETAIL_CATEGORIES[2].id, name: "Butter Croissants", description: "Flaky, deeply layered and baked fresh for the morning shelf.", unit_label: "2 pcs", selling_price: 159, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=85&auto=format&fit=crop", tags: ["Bakery"] },
  { id: "22222222-0000-4000-8000-000000000013", sku: "AF-DA-001", category_id: RETAIL_CATEGORIES[3].id, name: "Natural Greek Yogurt", description: "Thick, cultured yogurt with no unnecessary sweetness.", unit_label: "400 g", selling_price: 179, compare_at_price: 199, image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=85&auto=format&fit=crop", tags: ["Chilled", "Protein"] },
  { id: "22222222-0000-4000-8000-000000000014", sku: "AF-DA-002", category_id: RETAIL_CATEGORIES[3].id, name: "Free-range Eggs", description: "Carefully packed everyday eggs with rich golden yolks.", unit_label: "6 pcs", selling_price: 109, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=900&q=85&auto=format&fit=crop", tags: ["Chilled"] },
  { id: "22222222-0000-4000-8000-000000000015", sku: "AF-BE-001", category_id: RETAIL_CATEGORIES[4].id, name: "Cold-pressed Orange", description: "Bright citrus pressed in small batches with no added sugar.", unit_label: "300 ml", selling_price: 149, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=900&q=85&auto=format&fit=crop", tags: ["Cold-pressed"] },
  { id: "22222222-0000-4000-8000-000000000016", sku: "AF-BE-002", category_id: RETAIL_CATEGORIES[4].id, name: "Daily Green Juice", description: "Cucumber, apple, spinach and lime—cold pressed and clean.", unit_label: "300 ml", selling_price: 169, compare_at_price: null, image_url: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=900&q=85&auto=format&fit=crop", tags: ["Cold-pressed"] },
];

export const RETAIL_PRODUCTS: RetailProduct[] = PRODUCTS.map((product) => {
  const category = RETAIL_CATEGORIES.find((item) => item.id === product.category_id)!;
  return {
    ...product,
    category_slug: category.slug,
    category_name: category.name,
    stock_qty: 24,
    is_available: true,
  };
});
