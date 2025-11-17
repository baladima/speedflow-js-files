// Logic for Dashboard (dashboard.js)
async function initDashboard() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  // Check authentication
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    // Если не авторизован - редирект на логин
    window.location.href = "/auth/login";
    return;
  }

  // Setup logout button
  const logoutButton = document.querySelector('[auth-element="logout-button"]');

  if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
      e.preventDefault();

      logoutButton.classList.add("disabled");
      const originalText = logoutButton.textContent;
      const textElement = logoutButton.querySelector(
        '[auth-element="logout-button-text"]'
      );

      if (textElement) {
        textElement.textContent = "Logging out...";
      }

      try {
        await supabaseClient.auth.signOut();
        window.location.href = "/auth/login";
      } catch (error) {
        console.error("Logout error:", error);
        logoutButton.classList.remove("disabled");
        if (textElement) {
          textElement.textContent = originalText;
        }
      }
    });
  }

  // Initialize page-specific features
  const currentPath = window.location.pathname;

  if (currentPath.includes("/subscription")) {
    await initSubscriptionPage();
  } else if (currentPath.includes("/analyze")) {
    await initAnalyzePage();
  }
}

// Cancel subscription via Edge Function
async function cancelSubscription() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    showErrorModal("Unable to connect. Please refresh the page.");
    return false;
  }

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      showErrorModal("Please log in to continue.");
      return false;
    }

    // Get current subscription to get paddle_subscription_id
    const subscription = await getCurrentSubscription();
    if (!subscription || !subscription.paddle_subscription_id) {
      showErrorModal("No active subscription found to cancel.");
      return false;
    }

    console.log("Canceling subscription:", subscription.paddle_subscription_id);

    // Call your Edge Function to cancel via Paddle API
    const { data, error } = await supabaseClient.functions.invoke(
      "cancel-subscription",
      {
        body: {
          subscription_id: subscription.paddle_subscription_id,
        },
      }
    );

    console.log("Edge Function response:", { data, error });

    if (error) {
      console.error("Error canceling subscription:", error);

      // Try to get more details from the error
      let errorMessage = "Failed to cancel subscription.";

      if (error.message) {
        errorMessage += ` ${error.message}`;
      }

      // Check if there's error details in the response
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch (e) {
          console.error("Could not parse error body:", e);
        }
      }

      throw new Error(errorMessage);
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    console.log("Subscription canceled successfully:", data);
    return true;
  } catch (error) {
    console.error("Cancellation error:", error);

    // Show detailed error message
    const errorMsg = error.message || "An unknown error occurred";
    showErrorModal(
      `Failed to cancel subscription: ${errorMsg}\n\n` +
        `Please contact support at info@speedflow.cc if the issue persists.`
    );
    return false;
  }
}

// Subscription page logic
async function initSubscriptionPage() {
  console.log("Initializing subscription page");

  await updateSubscriptionDisplay();
  await displayPaymentHistory();

  // Check for plan query parameter (from pricing page)
  const urlParams = new URLSearchParams(window.location.search);
  const planFromUrl = urlParams.get("plan");

  if (planFromUrl && (planFromUrl === "monthly" || planFromUrl === "annual")) {
    console.log("Opening checkout for plan from URL:", planFromUrl);
    setTimeout(() => {
      openPaddleCheckout(planFromUrl);
    }, 500);
  }

  // Setup subscription buttons using data-plan attribute
  const pricingButtons = document.querySelectorAll("[data-plan]");

  pricingButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();

      const planType = button.getAttribute("data-plan");
      console.log("Subscription button clicked:", planType);

      // Get current subscription
      const subscription = await getCurrentSubscription();

      if (!subscription) {
        showErrorModal("Unable to load subscription. Please refresh the page.");
        return;
      }

      // If clicking current plan, do nothing
      if (subscription.plan === planType) {
        return;
      }

      // Handle different plan changes
      if (planType === "free") {
        // Downgrade to free - cancel subscription
        const confirmed = confirm(
          "Cancel subscription and downgrade to Free plan?\n\n" +
            "• You'll have access until your billing period ends\n" +
            "• After that, you'll have 10 analyses per month\n" +
            "• You can upgrade again anytime\n\n" +
            "Do you want to proceed with cancellation?"
        );

        if (confirmed) {
          // Disable button during processing
          button.classList.add("disabled");
          const originalText = button.textContent;
          button.textContent = "Canceling...";

          const success = await cancelSubscription();

          if (success) {
            showSuccessModal(
              "Subscription canceled successfully. You'll have access until the end of your billing period."
            );

            // Refresh the page after a delay
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            // Re-enable button if failed
            button.classList.remove("disabled");
            button.textContent = originalText;
          }
        }
      } else {
        // Upgrade to paid plan
        await openPaddleCheckout(planType);
      }
    });
  });
}

// Analyze page logic
async function initAnalyzePage() {
  console.log("Initializing analyze page");

  await updateUsageDisplay();

  // Your existing analyze button logic here
  // This integrates with your Edge Function
}

// Display payment history
async function displayPaymentHistory() {
  const supabaseClient = getSupabaseClient();
  const container = document.querySelector(
    '[subscription-element="payment-history"]'
  );
  if (!supabaseClient || !container) return;

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: webhookLogs, error } = await supabaseClient
      .from("paddle_webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const payments = webhookLogs
      .filter((log) => {
        try {
          const eventData =
            typeof log.event_data === "string"
              ? JSON.parse(log.event_data)
              : log.event_data;
          return eventData.event_type === "transaction.completed";
        } catch {
          return false;
        }
      })
      .map((log) => {
        const eventData =
          typeof log.event_data === "string"
            ? JSON.parse(log.event_data)
            : log.event_data;
        const data = eventData.data;
        return {
          date: log.created_at,
          amount: (parseFloat(data?.details?.totals?.total || 0) / 100).toFixed(
            2
          ),
          currency: data?.currency_code || "USD",
          status: data?.status || "completed",
          description: "Subscription payment",
        };
      });

    if (payments.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px;">No payment history yet.</p>';
      return;
    }

    let html =
      '<table style="width:100%; border-collapse:collapse; font-size:14px;"><thead><tr style="border-bottom:2px solid #e0e0e0;"><th style="padding:12px; text-align:left;">Date</th><th style="padding:12px; text-align:left;">Description</th><th style="padding:12px; text-align:right;">Amount</th><th style="padding:12px; text-align:center;">Status</th></tr></thead><tbody>';

    payments.forEach((p, i) => {
      const date = new Date(p.date).toLocaleDateString();
      const rowBg = i % 2 === 0 ? "background:#fafafa;" : "";
      html += `<tr style="${rowBg}"><td style="padding:12px;">${date}</td><td style="padding:12px;">${p.description}</td><td style="padding:12px; text-align:right; font-weight:500;">$${p.amount} ${p.currency}</td><td style="padding:12px; text-align:center;"><span style="color:#34a853; background:#e8f5e9; padding:4px 12px; border-radius:12px; font-size:12px;">${p.status}</span></td></tr>`;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Error loading payment history:", error);
    container.innerHTML =
      '<p style="color:#f44336; padding:20px;">Error loading payment history.</p>';
  }
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
