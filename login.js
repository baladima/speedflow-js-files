// Logic for login page (login.js)
async function initLogin() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const form = document.querySelector('form[form-element="form"]');
  if (!form) {
    console.error("Login form not found");
    return;
  }

  const emailInput = form.querySelector('input[form-element="email-input"]');
  const passwordInput = form.querySelector(
    'input[form-element="password-input"]'
  );
  const submitButton = form.querySelector('input[type="submit"]');

  // Hide messages on load
  hideMessages();

  // Clear errors on input
  emailInput.addEventListener("input", () => clearFieldError(emailInput));
  passwordInput.addEventListener("input", () => clearFieldError(passwordInput));

  // Handle email/password login form
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    // Hide previous messages
    hideMessages();
    clearAllFieldErrors(form);

    // Validate
    if (!validateForm(emailInput, passwordInput)) {
      return;
    }

    submitButton.classList.add("disabled");
    const originalValue = submitButton.value;
    submitButton.value = "Logging in...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const { data: loginData, error: loginError } =
        await supabaseClient.auth.signInWithPassword({ email, password });

      if (loginError) throw loginError;

      showSuccess("Login successful! Redirecting...");

      // Check for subscription intent
      const intent = getAndClearSubscriptionIntent();

      // Delay before redirect
      setTimeout(() => {
        if (intent && intent.plan !== "free") {
          window.location.href = "/dashboard/subscription";
        } else {
          window.location.href = "/dashboard/analyze";
        }
      }, 1000);
    } catch (error) {
      console.error(error);

      // More friendly error messages
      let errorMsg = error.message;
      if (error.message.includes("Invalid login credentials")) {
        errorMsg = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMsg = "Please verify your email before logging in.";
      }

      showError(errorMsg);
      submitButton.classList.remove("disabled");
      submitButton.value = originalValue;
    }
  });

  // ============================================
  // Google Sign In Button Handler
  // ============================================

  const googleSignInBtn = document.querySelector(
    '[auth-element="google-signin-btn"]'
  );

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Find the text div inside the button (not the icon)
      const textDiv = googleSignInBtn.querySelector(
        "div:not(.google-auth_button-icon)"
      );

      // Add loading state
      googleSignInBtn.classList.add("disabled");
      const originalText = textDiv
        ? textDiv.textContent
        : "Continue with Google";

      // Change only the text, keeping the icon
      if (textDiv) {
        textDiv.textContent = "Connecting to Google...";
      }

      try {
        await signInWithGoogle();
        // User will be redirected to Google, no need to remove loading state
      } catch (error) {
        console.error("Google sign in error:", error);
        googleSignInBtn.classList.remove("disabled");
        if (textDiv) {
          textDiv.textContent = originalText;
        }
        showError("Failed to connect to Google. Please try again.");
      }
    });
  }
}

// Инициализация при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}
