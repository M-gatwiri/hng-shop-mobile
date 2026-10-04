import { supabase } from "./supabase";

export async function getCart(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      id,
      user_id,
      product_id,
      quantity,
      created_at,
      products (
        id,
        name,
        price,
        image_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addToCart(userId, productId) {
  const { data: existingItem, error: findError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existingItem) {
    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: existingItem.quantity + 1,
      })
      .eq("id", existingItem.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .insert({
      user_id: userId,
      product_id: productId,
      quantity: 1,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function decreaseCartItem(userId, productId) {
  const { data: item, error: findError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (!item) {
    return;
  }

  if (item.quantity <= 1) {
    await removeFromCart(userId, productId);
    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .update({
      quantity: item.quantity - 1,
    })
    .eq("id", item.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFromCart(userId, productId) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message);
  }
}