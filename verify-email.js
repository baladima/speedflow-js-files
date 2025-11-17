// Логика для страницы верификации email
async function initEmailVerification() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const loadingEl = document.querySelector('[verify-element="loading"]');
  const successEl = document.querySelector('[verify-element="success"]');
  const errorEl = document.querySelector('[verify-element="error"]');
  const errorMessageEl = document.querySelector(
    '[verify-element="error-message"]'
  );

  // Получаем параметры из URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const type = urlParams.get("type");

  // Показываем loading состояние
  if (loadingEl) loadingEl.style.display = "flex";
  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  try {
    // Если есть токен в query параметрах
    if (token && type === "signup") {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        token_hash: token,
        type: "signup",
      });

      if (error) throw error;

      // Успешная верификация
      showSuccess();
      return;
    }

    // Если нет ни токена, ни hash
    throw new Error("No verification token found");
  } catch (error) {
    console.error("Verification error:", error);
    showError(error.message || "Email verification failed. Please try again.");
  }

  function showSuccess() {
    if (loadingEl) loadingEl.style.display = "none";
    if (successEl) successEl.style.display = "flex";
    if (errorEl) errorEl.style.display = "none";
  }

  function showError(message) {
    if (loadingEl) loadingEl.style.display = "none";
    if (successEl) successEl.style.display = "none";
    if (errorEl) errorEl.style.display = "flex";
    if (errorMessageEl) errorMessageEl.textContent = message;
  }
}

// Инициализация при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEmailVerification);
} else {
  initEmailVerification();
}
