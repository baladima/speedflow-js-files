// Pricing Buttons Handler (pricing-buttons.js)
// Upload to CodeSandbox: https://yl674z.csb.app/pricing-buttons.js

function initPricingButtons() {
  console.log("Initializing pricing buttons");

  // Find all pricing buttons with data-plan attribute
  const pricingButtons = document.querySelectorAll("[data-plan]");

  if (pricingButtons.length === 0) {
    console.warn("No pricing buttons found with [data-plan] attribute");
    return;
  }

  pricingButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();

      const planType = button.getAttribute("data-plan");
      console.log("Pricing button clicked:", planType);

      await handlePricingButtonClick(planType);
    });
  });

  console.log(`✅ Initialized ${pricingButtons.length} pricing buttons`);
}

// Handle pricing button click
async function handlePricingButtonClick(planType) {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  // Check if user is logged in
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    // Not logged in - redirect to signup
    console.log("User not logged in, redirecting to signup");
    window.location.href = "/auth/signup";
    return;
  }

  // User is logged in
  console.log("User is logged in, processing plan:", planType);

  if (planType === "free") {
    // For free plan, just go to dashboard
    window.location.href = "/dashboard/analyze";
  } else {
    // For paid plans, go to subscription page and open checkout
    window.location.href = `/dashboard/subscription?plan=${planType}`;
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPricingButtons);
} else {
  initPricingButtons();
}
