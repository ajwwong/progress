export const STRIPE_CONFIG = {
  // Test mode products
  TEST: {
    STANDARD: {
      productId: 'prod_RuJ136Rn5045S8', // Replace with your new Standard product ID
      plans: {
        SESSIONS_30: {
          priceId: 'price_1R0UlJIfLgrjtRiqrBl5AVE8',
          amount: 2900, // $29.00
          sessions: 30,
          interval: 'month'
        },
        SESSIONS_45: {
          priceId: 'price_1R0UlJIfLgrjtRiqKDpSb8Mz',
          amount: 4500, // $45.00
          sessions: 45,
          interval: 'month'
        },
        SESSIONS_60: {
          priceId: 'price_1R0UlJIfLgrjtRiqTfKFUGuG',
          amount: 5900, // $59.00
          sessions: 60,
          interval: 'month'
        },
        SESSIONS_80: {
          priceId: 'price_1R0UlJIfLgrjtRiqXYZ80ABC',
          amount: 7900, // $79.00
          sessions: 80,
          interval: 'month'
        },
        SESSIONS_100: {
          priceId: 'price_1R0UlJIfLgrjtRiqDEF100GHI',
          amount: 9900, // $99.00
          sessions: 100,
          interval: 'month'
        },
        SESSIONS_120: {
          priceId: 'price_1R0UlJIfLgrjtRiqJKL120MNO',
          amount: 11900, // $119.00
          sessions: 120,
          interval: 'month'
        },
        SESSIONS_150: {
          priceId: 'price_1R0UlJIfLgrjtRiqPQR150STU',
          amount: 14900, // $149.00
          sessions: 150,
          interval: 'month'
        },
        SESSIONS_200: {
          priceId: 'price_1R0UlJIfLgrjtRiqVWX200YZA',
          amount: 19800, // $198.00
          sessions: 200,
          interval: 'month'
        },
        SESSIONS_300: {
          priceId: 'price_1R0UlJIfLgrjtRiqBCD300EFG',
          amount: 29700, // $297.00
          sessions: 300,
          interval: 'month'
        },
        SESSIONS_400: {
          priceId: 'price_1R0UlJIfLgrjtRiqHIJ400KLM',
          amount: 39600, // $396.00
          sessions: 400,
          interval: 'month'
        },
        SESSIONS_500: {
          priceId: 'price_1R0UlJIfLgrjtRiqNOP500QRS',
          amount: 49600, // $496.00
          sessions: 500,
          interval: 'month'
        }
      }
    }
  },
  
  // Production mode products (to be filled in later)
  PROD: {
    STANDARD: {
      productId: '', // Will fill this in after creating live product
      plans: {
        SESSIONS_30: {
          priceId: '',
          amount: 2900,
          sessions: 30,
          interval: 'month'
        },
        // ... other plans will be added when going to production
      }
    }
  }
};
