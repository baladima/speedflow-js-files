// Logic for signup page (signup.js)
async function initSignup() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const form = document.querySelector('form[form-element="form"]');
  if (!form) {
    console.error("Sign up form not found");
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

  // Handle email/password signup form
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
    submitButton.value = "Please wait...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const { data: signUpData, error: signUpError } =
        await supabaseClient.auth.signUp({ email, password });

      if (signUpError) throw signUpError;

      showSuccess(
        "Registration successful! Please check your email to verify your account."
      );

      // Clear form
      form.reset();
      submitButton.classList.remove("disabled");
      submitButton.value = originalValue;
    } catch (error) {
      console.error(error);
      showError(error.message || "An error occurred during registration");
      submitButton.classList.remove("disabled");
      submitButton.value = originalValue;
    }
  });

  // ============================================
  // Google Sign Up Button Handler
  // ============================================

  const googleSignUpBtn = document.querySelector(
    '[auth-element="google-signup-btn"]'
  );

  if (googleSignUpBtn) {
    googleSignUpBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Find the text div inside the button (not the icon)
      const textDiv = googleSignUpBtn.querySelector(
        "div:not(.google-auth_button-icon)"
      );

      // Add loading state
      googleSignUpBtn.classList.add("disabled");
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
        console.error("Google sign up error:", error);
        googleSignUpBtn.classList.remove("disabled");
        if (textDiv) {
          textDiv.textContent = originalText;
        }
        showError("Failed to connect to Google. Please try again.");
      }
    });
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSignup);
} else {
  initSignup();
}
