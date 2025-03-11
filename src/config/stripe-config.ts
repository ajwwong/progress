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
          priceId: 'price_1R0UlJIfLgrjtRiqED7TsKjN',
          amount: 7900, // $79.00
          sessions: 80,
          interval: 'month'
        },
        SESSIONS_100: {
          priceId: 'price_1R0UlJIfLgrjtRiqWGMnViYR',
          amount: 9900, // $99.00
          sessions: 100,
          interval: 'month'
        },
        SESSIONS_120: {
          priceId: 'price_1R0UlJIfLgrjtRiqTf1tMIzR',
          amount: 11900, // $119.00
          sessions: 120,
          interval: 'month'
        },
        SESSIONS_150: {
          priceId: 'price_1R0UlJIfLgrjtRiqqNCMiYbb',
          amount: 14900, // $149.00
          sessions: 150,
          interval: 'month'
        },
        SESSIONS_200: {
          priceId: 'price_1R0UlJIfLgrjtRiq0Z4XpUpJ',
          amount: 19800, // $198.00
          sessions: 200,
          interval: 'month'
        },
        SESSIONS_300: {
          priceId: 'price_1R0UlJIfLgrjtRiqHIbpQrL7',
          amount: 29700, // $297.00
          sessions: 300,
          interval: 'month'
        },
        SESSIONS_400: {
          priceId: 'price_1R0UlJIfLgrjtRiqM8JrLJrw',
          amount: 39600, // $396.00
          sessions: 400,
          interval: 'month'
        },
        SESSIONS_500: {
          priceId: 'price_1R0UlJIfLgrjtRiqBkoTkbum',
          amount: 49600, // $496.00
          sessions: 500,
          interval: 'month'
        }
      }
    }
  },
  
  // Production mode products
  PROD: {
    STANDARD: {
      productId: 'prod_RuglFA4O4PJLnV', // Production product ID
      plans: {
        SESSIONS_1: {
          priceId: 'price_1R116uIfLgrjtRiqwRBCuwLe',
          amount: 100, // $1.00
          sessions: 1,
          interval: 'month'
        },
        SESSIONS_20: {
          priceId: 'price_1R0rWeIfLgrjtRiqslYBfEcJ',
          amount: 900, // $9.00
          sessions: 20,
          interval: 'month'
        },
        SESSIONS_40: {
          priceId: 'price_1R0rOJIfLgrjtRiqEkey827c',
          amount: 1900, // $19.00
          sessions: 40,
          interval: 'month'
        },
        SESSIONS_60: {
          priceId: 'price_1R0rQMIfLgrjtRiquFCsq1Du',
          amount: 2900, // $29.00
          sessions: 60,
          interval: 'month'
        },
        SESSIONS_80: {
          priceId: 'price_1R0rWeIfLgrjtRiqM8RQXfmt',
          amount: 3900, // $39.00
          sessions: 80,
          interval: 'month'
        },
        SESSIONS_100: {
          priceId: 'price_1R0rQMIfLgrjtRiqsxZtyiQX',
          amount: 4900, // $49.00
          sessions: 100,
          interval: 'month'
        },
        SESSIONS_120: {
          priceId: 'price_1R0rOJIfLgrjtRiqNuH3bTD8',
          amount: 5900, // $59.00
          sessions: 120,
          interval: 'month'
        },
        SESSIONS_140: {
          priceId: 'price_1R0rWeIfLgrjtRiqBR4L8kMI',
          amount: 6900, // $69.00
          sessions: 140,
          interval: 'month'
        },
        SESSIONS_160: {
          priceId: 'price_1R0rWeIfLgrjtRiqPzF583G6',
          amount: 7900, // $79.00
          sessions: 160,
          interval: 'month'
        },
        SESSIONS_200: {
          priceId: 'price_1R0rYBIfLgrjtRiq1WmmBbkL',
          amount: 9900, // $99.00
          sessions: 200,
          interval: 'month'
        },
        SESSIONS_300: {
          priceId: 'price_1R0s0jIfLgrjtRiqPQt4x4je',
          amount: 14900, // $149.00
          sessions: 300,
          interval: 'month'
        },
        SESSIONS_400: {
          priceId: 'price_1R0s2IIfLgrjtRiq8RLFLpqM',
          amount: 19700, // $197.00
          sessions: 400,
          interval: 'month'
        }
      }
    }
  }
};

const mode = import.meta.env.VITE_STRIPE_MODE as 'TEST' | 'PROD';
