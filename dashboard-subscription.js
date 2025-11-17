// Dashboard Subscription Page Logic (dashboard-subscription.js)

async function initDashboardSubscription() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "/auth/login";
    return;
  }

  await updateSubscriptionDisplay();
  await displayPaymentHistory();

  // Check for subscription intent
  const intent = getAndClearSubscriptionIntent();
  if (intent && intent.plan && intent.plan !== "free") {
    setTimeout(() => openPaddleCheckout(intent.plan), 500);
  }

  setupSubscriptionButtons();
  setupLogoutButton();
}

function setupSubscriptionButtons() {
  const monthlyBtn = document.querySelector('[subscription-button="monthly"]');
  if (monthlyBtn) {
    monthlyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openPaddleCheckout("monthly");
    });
  }

  const annualBtn = document.querySelector('[subscription-button="annual"]');
  if (annualBtn) {
    annualBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openPaddleCheckout("annual");
    });
  }

  const freeBtn = document.querySelector('[subscription-button="free"]');
  if (freeBtn) {
    freeBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (
        confirm(
          "Downgrade to Free plan? (10 analyses/month limit)\n\nAccess continues until billing period ends."
        )
      ) {
        showError("To cancel your subscription, please contact support.");
      }
    });
  }
}

function setupLogoutButton() {
  const logoutButton = document.querySelector('[auth-element="logout-button"]');
  if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
      e.preventDefault();
      const supabaseClient = getSupabaseClient();
      await supabaseClient.auth.signOut();
      window.location.href = "/auth/login";
    });
  }
}
