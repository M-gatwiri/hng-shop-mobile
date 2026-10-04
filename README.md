# HNG Shop Mobile

A React Native mobile application for the HNG Shop, providing users with a seamless shopping experience. The mobile app shares the same Supabase backend as the existing HNG Shop website, enabling real-time cart synchronization across devices.

## Overview

HNG Shop Mobile is the mobile companion to the HNG Shop website. Users can:
- Browse featured products with detailed information
- Sign in securely using Google authentication
- Add products to their cart and manage quantities
- View real-time cart totals
- Sync cart changes between the mobile app and website in real time

The app leverages Supabase for authentication, data storage, and real-time updates, ensuring a consistent shopping experience across all platforms.

## Features

- **Google Authentication**: Secure sign-in using OAuth via Supabase
- **Product Listing**: Browse all available products with images, descriptions, prices, and stock information
- **Add to Cart**: Easily add products to your shopping cart
- **Manage Cart Quantity**: Increase or decrease item quantities with dedicated buttons
- **Remove Cart Items**: Delete items from your cart with a single tap
- **Cart Total Calculation**: Automatic calculation of the total cart value
- **Real-Time Cart Synchronization**: Changes made on the website or another device appear instantly in the mobile app via Supabase's real-time subscriptions
- **Persistent Authentication**: Sessions are stored locally and automatically restored on app launch

## Tech Stack

- **React Native** (0.86.3) — Cross-platform mobile development framework
- **Expo** (~57.0.26) — Managed React Native platform and SDK
- **Supabase** (^2.117.2) — Backend as a Service (authentication, database, real-time features)
- **Expo Auth Session** (~57.0.13) — OAuth authentication handling
- **AsyncStorage** (2.2.0) — Local session persistence
- **Expo Web Browser** (~57.0.3) — Browser control for OAuth flows
- **Expo Crypto** (~57.0.3) — Cryptographic utilities
- **Expo Linking** (~57.0.11) — Deep linking and URL handling

## Project Structure

```
hng-shop-mobile/
├── App.js                    # Main application component (authentication, UI, cart management)
├── app.json                  # Expo configuration (package name, version, plugins)
├── package.json              # Project dependencies and scripts
├── lib/
│   ├── supabase.js          # Supabase client initialization with AsyncStorage integration
│   ├── productService.js    # Functions to fetch products from Supabase
│   └── cartService.js       # Cart operations (add, remove, decrease, fetch)
├── assets/                   # App icons and images
└── .env                      # Environment variables (not committed)
```

### Key Files

- **App.js**: Contains the main app logic, including user authentication flow, product loading, cart management, and real-time cart synchronization using Supabase subscriptions.

- **lib/supabase.js**: Initializes the Supabase client with AsyncStorage for persistent session storage and automatic token refresh.

- **lib/productService.js**: Provides the `getProducts()` function to fetch all products from the `products` table, ordered by creation date.

- **lib/cartService.js**: Provides cart operations:
  - `getCart(userId)` — Fetches user's cart items with related product data
  - `addToCart(userId, productId)` — Adds a product or increments quantity if it already exists
  - `decreaseCartItem(userId, productId)` — Decrements quantity or removes item if quantity reaches 1
  - `removeFromCart(userId, productId)` — Deletes a cart item

- **app.json**: Expo configuration including project metadata, Android package name (`com.mercygatwiri.hngshopmobile`), app orientation, and icon assets.

## Getting Started

### Prerequisites

- Node.js (LTS or current version)
- Expo CLI installed globally or use `npx expo`
- A physical Android device or emulator (Android SDK)
- A Supabase project with Google OAuth configured
- Supabase credentials (URL and public key)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/M-gatwiri/hng-shop-mobile.git
   cd hng-shop-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_public_key
   ```

4. **Start the Expo development server:**
   ```bash
   npm start
   ```

   To run on Android:
   ```bash
   npm run android
   ```

## Environment Variables

The application requires the following environment variables to be set in a `.env` file:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase public anon key |

⚠️ **Important Security Notice:**
- Do **not** commit the `.env` file to version control
- Do **not** expose your Supabase keys in public repositories
- Never commit credentials or secrets to Git
- Only share Supabase public keys; keep admin keys private

## Authentication

The app uses **Google OAuth** for user authentication via Supabase:

1. User taps "Continue with Google" on the login screen
2. The app opens a web browser with Google's OAuth consent screen
3. After user approval, Google redirects back to the app using a deep link (`hngshopmobile://auth/callback`)
4. The app extracts the OAuth tokens and creates a Supabase session
5. The session is persisted locally using AsyncStorage for automatic restoration on app launch

The authentication state is monitored via Supabase's `onAuthStateChange` listener, which triggers updates to the UI when the user logs in or out.

## Cart Synchronization

Cart data is stored in the Supabase `cart_items` table with the following structure:
- `id` — Unique cart item identifier
- `user_id` — User's ID (from authentication)
- `product_id` — Product ID
- `quantity` — Item quantity
- `created_at` — Timestamp
- Related `products` table data (product details)

**Real-Time Updates:**
The app establishes a real-time Supabase subscription that listens to all changes in the `cart_items` table. When any change occurs (insertion, update, or deletion):
- The app automatically fetches the updated cart
- The UI updates instantly to reflect the change

This means:
- If you add an item on the website, it appears immediately in the mobile app
- If you remove an item in another app session or on another device, the mobile app updates right away
- Cart totals are recalculated in real time

## Testing

The application has been tested on a **physical Android device** to ensure functionality and performance across real hardware.

## Project Context

This project was created as part of the **HNG Internship** individual mobile-app task, contributing to the HNG Shop ecosystem with a native mobile experience.

## License

This project is part of the HNG Internship program. Refer to the repository's license file for details.
