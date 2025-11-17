// Subscription Manager (subscription-manager.js)

// Get current user subscription
async function getCurrentSubscription() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return null;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error getting subscription:", error);
    return null;
  }

  return data;
}

// Check if user can perform analysis
async function canPerformAnalysis() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return false;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return false;

  // Use the SQL function we created
  const { data, error } = await supabaseClient.rpc("can_user_analyze", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error checking analysis permission:", error);
    return false;
  }

  return data === true;
}

// Reset usage counter
async function resetUsage() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) return;

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await supabaseClient
    .from("users") // Changed from 'active_subscriptions'
    .update({
      used_this_month: 0,
      usage_reset_date: nextMonth.toISOString(),
    })
    .eq("user_id", user.id);
}

// Get usage info for display
async function getUsageInfo() {
  const subscription = await getCurrentSubscription();
  console.log("Subscription Information: ", subscription);
  if (!subscription) return null;

  if (subscription.plan !== "free") {
    return {
      plan: subscription.plan,
      unlimited: true,
    };
  }

  return {
    plan: "free",
    used: subscription.used_this_month || 0,
    limit: subscription.monthly_limit || 10,
    remaining:
      (subscription.monthly_limit || 10) - (subscription.used_this_month || 0),
  };
}

// Update subscription display on page
async function updateSubscriptionDisplay() {
  const subscription = await getCurrentSubscription();
  console.log("Subscription Information: ", subscription);
  if (!subscription) return;

  // Update plan type
  const planElement = document.querySelector(
    '[subscription-element="plan-type"]'
  );
  if (planElement) {
    const planNames = {
      free: "Free Plan",
      monthly: "Monthly Plan",
      annual: "Annual Plan",
    };
    planElement.textContent = planNames[subscription.plan] || subscription.plan;
  }

  // Update status
  const statusElement = document.querySelector(
    '[subscription-element="status"]'
  );
  if (statusElement) {
    statusElement.textContent = subscription.subscription_status || "active";
    statusElement.className = `status-${
      subscription.subscription_status || "active"
    }`;
  }

  // Update usage
  const usageElement = document.querySelector('[subscription-element="usage"]');
  if (usageElement) {
    if (subscription.plan === "free") {
      const used = subscription.used_this_month || 0;
      const limit = subscription.monthly_limit || 10;
      usageElement.textContent = `${used} / ${limit} analyses used this month`;
    } else {
      usageElement.textContent = "Unlimited analyses";
    }
  }

  // Update renewal date
  if (subscription.subscription_current_period_end) {
    const renewalElement = document.querySelector(
      '[subscription-element="renewal-date"]'
    );
    if (renewalElement) {
      const date = new Date(subscription.subscription_current_period_end);
      renewalElement.textContent = date.toLocaleDateString();
    }
  }

  // Show/hide buttons based on plan
  updateSubscriptionButtons(subscription.plan);
}

// Update button visibility and states
function updateSubscriptionButtons(currentPlan) {
  const freeBtn = document.querySelector('[data-plan="free"]');
  const monthlyBtn = document.querySelector('[data-plan="monthly"]');
  const annualBtn = document.querySelector('[data-plan="annual"]');

  // Reset all buttons first
  [freeBtn, monthlyBtn, annualBtn].forEach((btn) => {
    if (btn) {
      btn.classList.remove("is-disabled");
      btn.removeAttribute("disabled");
    }
  });

  // Update based on current plan
  if (currentPlan === "free") {
    if (freeBtn) {
      freeBtn.classList.add("is-disabled");
      freeBtn.setAttribute("disabled", "true");
      const textElement = freeBtn.querySelector("div") || freeBtn;
      textElement.textContent = "You're on Free Plan";
    }
  } else if (currentPlan === "monthly") {
    if (monthlyBtn) {
      monthlyBtn.classList.add("is-disabled");
      monthlyBtn.setAttribute("disabled", "true");
      const textElement = monthlyBtn.querySelector("div") || monthlyBtn;
      textElement.textContent = "You're on Monthly Plan";
    }
  } else if (currentPlan === "annual") {
    if (annualBtn) {
      annualBtn.classList.add("is-disabled");
      annualBtn.setAttribute("disabled", "true");
      const textElement = annualBtn.querySelector("div") || annualBtn;
      textElement.textContent = "You're on Annual Plan";
    }
  }
}

// Show upgrade modal (Webflow modal)
function showUpgradeModal() {
  const modal = document.querySelector('[modal-element="upgrade-modal"]');
  if (!modal) {
    console.error("Upgrade modal not found");
    return;
  }

  // Update modal content
  const titleElement = modal.querySelector('[modal-element="title"]');
  const messageElement = modal.querySelector('[modal-element="message"]');

  if (titleElement) {
    titleElement.textContent = "Analysis Limit Reached";
  }

  if (messageElement) {
    messageElement.textContent =
      "You've used all 10 free analyses this month. Upgrade to get unlimited analyses!";
  }

  // Show modal
  modal.style.display = "flex";
}

// Hide upgrade modal
function hideUpgradeModal() {
  const modal = document.querySelector('[modal-element="upgrade-modal"]');
  if (modal) {
    modal.style.display = "none";
  }
}

// Show success modal (after payment)
function showSuccessModal(message) {
  const modal = document.querySelector('[modal-element="success-modal"]');
  if (!modal) return;

  const messageElement = modal.querySelector('[modal-element="message"]');
  if (messageElement) {
    messageElement.textContent = message || "Success!";
  }

  modal.style.display = "flex";
}

// Hide success modal
function hideSuccessModal() {
  const modal = document.querySelector('[modal-element="success-modal"]');
  if (modal) {
    modal.style.display = "none";
  }
}

// Show error modal
function showErrorModal(message) {
  const modal = document.querySelector('[modal-element="error-modal"]');
  if (!modal) return;

  const messageElement = modal.querySelector('[modal-element="message"]');
  if (messageElement) {
    messageElement.textContent = message || "An error occurred";
  }

  modal.style.display = "flex";
}

// Hide error modal
function hideErrorModal() {
  const modal = document.querySelector('[modal-element="error-modal"]');
  if (modal) {
    modal.style.display = "none";
  }
}

// Setup modal close buttons
function setupModalCloseButtons() {
  // Close buttons
  const closeButtons = document.querySelectorAll('[modal-action="close"]');
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      hideUpgradeModal();
      hideSuccessModal();
      hideErrorModal();
    });
  });

  // Upgrade button in modal
  const upgradeBtn = document.querySelector('[modal-action="upgrade"]');
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
      window.location.href = "/dashboard/subscription";
    });
  }

  // Close on background click
  const modals = document.querySelectorAll("[modal-element]");
  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });
}

// Initialize modals on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupModalCloseButtons);
} else {
  setupModalCloseButtons();
}
