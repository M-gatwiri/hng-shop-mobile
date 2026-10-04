
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";

import { supabase } from "./lib/supabase";
import { getProducts } from "./lib/productService";
import {
  getCart,
  addToCart,
  decreaseCartItem,
  removeFromCart,
} from "./lib/cartService";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
  scheme: "hngshopmobile",
  path: "auth/callback",
});

async function createSessionFromUrl(url) {
  console.log("CALLBACK URL:", url);

  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    console.log("CALLBACK ERROR:", errorCode);
    return;
  }

  const { access_token, refresh_token } = params;

  if (!access_token || !refresh_token) {
    console.log("NO TOKENS FOUND");
    return;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    console.log("SESSION ERROR:", error.message);
    return;
  }

  console.log("LOGIN SUCCESS:", data.session?.user?.email);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setLoading(false);
    }

    initialize();

    const urlSubscription = Linking.addEventListener("url", ({ url }) => {
      createSessionFromUrl(url);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("AUTH EVENT:", _event);
      setUser(session?.user ?? null);
    });

    return () => {
      urlSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setCart([]);
      return;
    }

    async function loadShop() {
      try {
        setLoadingProducts(true);
        setError("");

        const [productsData, cartData] = await Promise.all([
          getProducts(),
          getCart(user.id),
        ]);

        setProducts(productsData);
        setCart(cartData);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadShop();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(`mobile-cart-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
        },
        async () => {
          try {
            const updatedCart = await getCart(user.id);
            setCart(updatedCart);
          } catch (error) {
            setError(error.message);
          }
        }
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function signInWithGoogle() {
    try {
      console.log("STARTING GOOGLE LOGIN");
      console.log("REDIRECT URI:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.log("OAUTH ERROR:", error.message);
        setError(error.message);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log("AUTH RESULT:", result);

      if (result.type === "success") {
        await createSessionFromUrl(result.url);
      }
    } catch (error) {
      console.log("AUTH SESSION ERROR:", error);
      setError(error.message);
    }
  }

  async function handleAddToCart(productId) {
    try {
      setError("");

      await addToCart(user.id, productId);

      const updatedCart = await getCart(user.id);
      setCart(updatedCart);
    } catch (error) {
      setError(error.message);
    }
  }

  async function handleDecrease(productId) {
    try {
      setError("");

      await decreaseCartItem(user.id, productId);

      const updatedCart = await getCart(user.id);
      setCart(updatedCart);
    } catch (error) {
      setError(error.message);
    }
  }

  async function handleRemove(productId) {
    try {
      setError("");

      await removeFromCart(user.id, productId);

      const updatedCart = await getCart(user.id);
      setCart(updatedCart);
    } catch (error) {
      setError(error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setCart([]);
  }

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce((total, item) => {
    const price = item.products?.price ?? 0;
    return total + price * item.quantity;
  }, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>HNG15 SHOP</Text>

        <Text style={styles.subtitle}>
          Shop your favourite tech essentials.
        </Text>

        <Button
          title="Continue with Google"
          onPress={signInWithGoogle}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  if (loadingProducts) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading shop...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.shopLabel}>HNG15 SHOP</Text>

          <Text style={styles.headerTitle}>
            Shop your favourites.
          </Text>

          <Text style={styles.userText}>
            {user.email}
          </Text>
        </View>

        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>
            🛒 {cartItemCount}
          </Text>
        </View>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>
          Featured Products
        </Text>

        {products.map((product) => (
          <View
            key={product.id}
            style={styles.productCard}
          >
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
            />

            <View style={styles.productInfo}>
              <Text style={styles.productName}>
                {product.name}
              </Text>

              <Text style={styles.productDescription}>
                {product.description}
              </Text>

              <Text style={styles.price}>
                KSh {product.price}
              </Text>

              <Text style={styles.stock}>
                {product.stock} in stock
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(product.id)}
              >
                <Text style={styles.addButtonText}>
                  Add to cart
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>
            Your Cart
          </Text>

          {cart.length === 0 ? (
            <Text style={styles.emptyCart}>
              Your cart is empty.
            </Text>
          ) : (
            <>
              {cart.map((item) => {
                const product = item.products;

                return (
                  <View
                    key={item.id}
                    style={styles.cartItem}
                  >
                    <Image
                      source={{ uri: product?.image_url }}
                      style={styles.cartImage}
                    />

                    <View style={styles.cartInfo}>
                      <Text style={styles.cartName}>
                        {product?.name}
                      </Text>

                      <Text style={styles.cartPrice}>
                        KSh {product?.price}
                      </Text>

                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleDecrease(item.product_id)
                          }
                        >
                          <Text style={styles.quantityButtonText}>
                            −
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.quantity}>
                          {item.quantity}
                        </Text>

                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleAddToCart(item.product_id)
                          }
                        >
                          <Text style={styles.quantityButtonText}>
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          handleRemove(item.product_id)
                        }
                      >
                        <Text style={styles.removeText}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.itemTotal}>
                      KSh{" "}
                      {(product?.price ?? 0) * item.quantity}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>
                  Cart Total
                </Text>

                <Text style={styles.totalAmount}>
                  KSh {cartTotal}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.signOut}>
          <Button
            title="Sign Out"
            onPress={signOut}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7ed",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff7ed",
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#ff6b35",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  shopLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },

  userText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 12,
  },

  cartBadge: {
    backgroundColor: "#5f0f40",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },

  cartBadgeText: {
    color: "#fff",
    fontWeight: "800",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    color: "#5f0f40",
  },

  productCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 18,
    overflow: "hidden",
    elevation: 3,
  },

  productImage: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
  },

  productInfo: {
    padding: 16,
  },

  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5f0f40",
  },

  productDescription: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
    color: "#e63946",
  },

  stock: {
    marginTop: 4,
    fontSize: 13,
  },

  addButton: {
    marginTop: 14,
    backgroundColor: "#5f0f40",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  cartSection: {
    marginTop: 20,
  },

  emptyCart: {
    fontSize: 16,
    marginBottom: 20,
  },

  cartItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  cartImage: {
    width: 75,
    height: 75,
    borderRadius: 12,
    resizeMode: "cover",
  },

  cartInfo: {
    flex: 1,
    marginLeft: 12,
  },

  cartName: {
    fontSize: 16,
    fontWeight: "800",
  },

  cartPrice: {
    marginTop: 4,
    fontSize: 14,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "800",
  },

  removeText: {
    color: "#e63946",
    fontWeight: "700",
    marginTop: 7,
  },

  itemTotal: {
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 8,
  },

  totalBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#5f0f40",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  totalAmount: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },

  signOut: {
    marginTop: 30,
    marginBottom: 20,
  },

  error: {
    color: "#d00000",
    textAlign: "center",
    padding: 12,
    fontWeight: "600",
  },
});
