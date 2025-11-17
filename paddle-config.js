// Paddle Configuration for Speedflow
const PADDLE_CONFIG = {
  token: "live_37e80aa0954c57329fcdd83b315",
  // Note: Environment is determined by token prefix (live_ = production, test_ = sandbox)

  products: {
    monthly: "pri_01k5f3mb1fer831xqhyqbrkhnv", // $19/month
    annual: "pri_01k5f3prww85zzsqqej3cym840", // $144/year
  },

  planLimits: {
    free: 10,
    monthly: -1, // unlimited
    annual: -1, // unlimited
  },
};

// Initialize Paddle
function initializePaddle() {
  if (typeof Paddle === "undefined") {
    console.error("Paddle.js not loaded");
    return false;
  }

  Paddle.Initialize({
    token: PADDLE_CONFIG.token,
    eventCallback: handlePaddleEvent,
  });

  console.log("✅ Paddle initialized");
  return true;
}

// Handle successful checkout
async function handleCheckoutComplete(data) {
  console.log("✅ Checkout completed:", data);

  showSuccessModal("🎉 Payment successful! Activating your subscription...");

  // Wait for webhook to process
  setTimeout(() => {
    hideSuccessModal();
    window.location.href = "/dashboard/analyze";
  }, 3000);
}

// Handle Paddle events
function handlePaddleEvent(data) {
  console.log("Paddle event:", data.name);

  switch (data.name) {
    case "checkout.completed":
      handleCheckoutComplete(data);
      break;

    case "checkout.closed":
      console.log("User closed checkout");
      break;

    case "checkout.payment.failed":
      showErrorModal(
        "Payment failed. Please try again or use a different payment method."
      );
      break;

    case "checkout.error":
      showErrorModal("An error occurred. Please try again.");
      break;
  }
}

// Open Paddle Checkout
async function openPaddleCheckout(planType) {
  if (typeof Paddle === "undefined") {
    showErrorModal("Payment system not loaded. Please refresh the page.");
    return;
  }

  const priceId = PADDLE_CONFIG.products[planType];
  if (!priceId) {
    showErrorModal("Invalid plan selected.");
    return;
  }

  try {
    // Get current user
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      showErrorModal("Unable to load user data. Please refresh the page.");
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      showErrorModal("Please log in to continue.");
      window.location.href = "/auth/login";
      return;
    }

    // Open Paddle checkout
    Paddle.Checkout.open({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customer: {
        email: user.email,
      },
      customData: {
        user_id: user.id,
        plan_type: planType,
      },
      settings: {
        displayMode: "overlay",
        theme: "light",
        locale: "en",
        successUrl: `${window.location.origin}/dashboard/analyze?success=true`,
      },
    });
  } catch (error) {
    console.error("Error opening checkout:", error);
    showErrorModal("Failed to open checkout. Please try again.");
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePaddle);
} else {
  initializePaddle();
}
