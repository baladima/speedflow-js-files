// Common Supabase configuration for the entire site (supabase-config.js)
const SUPABASE_CONFIG = {
  url: "https://hnkuvmdpwrerpjogidxk.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhua3V2bWRwd3JlcnBqb2dpZHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTY5NTcsImV4cCI6MjA3NTM5Mjk1N30.jyQLInSdGNzPpfpv_goTm1qnETIeAHGQK0tyOK-D-y8",
};

// Initialize Supabase client (singleton pattern to avoid multiple instances)
let supabaseClientInstance = null;

function getSupabaseClient() {
  if (typeof window.supabase === "undefined") {
    console.error("Supabase library not loaded");
    return null;
  }

  // Return existing instance if already created
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  // Create new instance only if it doesn't exist
  supabaseClientInstance = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.key
  );

  return supabaseClientInstance;
}

// Output user information to console (if authenticated)
async function logCurrentUser() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    console.log("=== Current User Info ===");
    console.log("User:", session.user);
    console.log("Email:", session.user.email);
    console.log("User ID:", session.user.id);
    console.log(
      "Auth Provider:",
      session.user.app_metadata?.provider || "email"
    );
    if (session.user.user_metadata?.full_name) {
      console.log("Name:", session.user.user_metadata.full_name);
    }
    if (session.user.user_metadata?.avatar_url) {
      console.log("Avatar:", session.user.user_metadata.avatar_url);
    }
    console.log("========================");
  } else {
    console.log("No user logged in");
  }
}

// Automatically output information when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", logCurrentUser);
} else {
  logCurrentUser();
}

// Common functions for working with messages
function showError(message) {
  const errorMessage = document.querySelector('[form-element="error-message"]');
  const successMessage = document.querySelector(
    '[form-element="success-message"]'
  );

  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
  if (successMessage) {
    successMessage.style.display = "none";
  }
}

function showSuccess(message) {
  const successMessage = document.querySelector(
    '[form-element="success-message"]'
  );
  const errorMessage = document.querySelector('[form-element="error-message"]');

  if (successMessage) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
  }
  if (errorMessage) {
    errorMessage.style.display = "none";
  }
}

function hideMessages() {
  const errorMessage = document.querySelector('[form-element="error-message"]');
  const successMessage = document.querySelector(
    '[form-element="success-message"]'
  );

  if (errorMessage) errorMessage.style.display = "none";
  if (successMessage) successMessage.style.display = "none";
}

// Validation functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return "Email is required";
  }

  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

function validatePassword(password) {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }

  return null;
}

// Show error under specific field
function showFieldError(input, message) {
  // Удаляем предыдущую ошибку если есть
  clearFieldError(input);

  // Create error element
  const errorDiv = document.createElement("div");
  errorDiv.className = "field-error";
  errorDiv.textContent = message;
  errorDiv.setAttribute("data-field-error", "true");

  // Add error after input
  input.parentNode.insertBefore(errorDiv, input.nextSibling);

  // Add error class to input
  input.classList.add("input-error");
}

// Clear error under specific field
function clearFieldError(input) {
  const existingError = input.parentNode.querySelector(
    '[data-field-error="true"]'
  );
  if (existingError) {
    existingError.remove();
  }
  input.classList.remove("input-error");
}

// Clear all field errors in form
function clearAllFieldErrors(form) {
  const allErrors = form.querySelectorAll('[data-field-error="true"]');
  allErrors.forEach((error) => error.remove());

  const allInputs = form.querySelectorAll(".input-error");
  allInputs.forEach((input) => input.classList.remove("input-error"));
}

// Validate form with email and password
function validateForm(emailInput, passwordInput) {
  let isValid = true;

  // Validate email
  const emailError = validateEmail(emailInput.value.trim());
  if (emailError) {
    showFieldError(emailInput, emailError);
    isValid = false;
  }

  // Validate password
  const passwordError = validatePassword(passwordInput.value);
  if (passwordError) {
    showFieldError(passwordInput, passwordError);
    isValid = false;
  }

  return isValid;
}

// Validate email only (for password reset form)
function validateEmailOnly(emailInput) {
  const emailError = validateEmail(emailInput.value.trim());
  if (emailError) {
    showFieldError(emailInput, emailError);
    return false;
  }
  return true;
}

// Validate passwords with confirmation
function validatePasswords(passwordInput, confirmPasswordInput) {
  let isValid = true;

  // Validate main password
  const passwordError = validatePassword(passwordInput.value);
  if (passwordError) {
    showFieldError(passwordInput, passwordError);
    isValid = false;
  }

  // Validate password confirmation
  if (confirmPasswordInput) {
    if (!confirmPasswordInput.value) {
      showFieldError(confirmPasswordInput, "Please confirm your password");
      isValid = false;
    } else if (passwordInput.value !== confirmPasswordInput.value) {
      showFieldError(confirmPasswordInput, "Passwords do not match");
      isValid = false;
    }
  }

  return isValid;
}

// ============================================
// Google Authentication Functions
// ============================================

// Sign in with Google
async function signInWithGoogle() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard/analyze`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;

    // User will be redirected to Google's consent page
    // After authorization, they'll be redirected back to your site
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
    showError("Failed to sign in with Google. Please try again.");
  }
}

// Handle OAuth callback (automatically called on page load)
async function handleOAuthCallback() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  // Check if we're returning from an OAuth provider
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");

  if (accessToken) {
    console.log("OAuth callback detected, processing authentication...");

    // Get the session
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      showError("Authentication error. Please try logging in again.");
      return;
    }

    if (session) {
      console.log("User authenticated via OAuth:", session.user);
      // Redirect will happen automatically via auth state change
    }
  }
}

// Listen for auth state changes (handles OAuth callbacks automatically)
async function initAuthListener() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event);

    if (event === "SIGNED_IN" && session) {
      console.log("User signed in:", session.user.email);

      // If we're on login/signup page, redirect to dashboard
      const currentPath = window.location.pathname;
      if (
        currentPath.includes("/auth/login") ||
        currentPath.includes("/auth/signup")
      ) {
        window.location.href = "/dashboard/analyze";
      }
    } else if (event === "SIGNED_OUT") {
      console.log("User signed out");

      // If we're on a protected page, redirect to login
      const currentPath = window.location.pathname;
      if (currentPath.includes("/dashboard")) {
        window.location.href = "/auth/login";
      }
    }
  });
}

// Initialize OAuth callback handler on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    handleOAuthCallback();
    initAuthListener();
  });
} else {
  handleOAuthCallback();
  initAuthListener();
}
