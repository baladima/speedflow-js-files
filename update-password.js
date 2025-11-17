// Логика для страницы установки нового пароля
async function initPasswordUpdate() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const form = document.querySelector('form[form-element="form"]');
  if (!form) {
    console.error("Password update form not found");
    return;
  }

  const passwordInput = form.querySelector(
    'input[form-element="password-input"]'
  );
  const confirmPasswordInput = form.querySelector(
    'input[form-element="confirm-password-input"]'
  );
  const submitButton = form.querySelector('input[type="submit"]');

  // Скрываем сообщения при загрузке
  hideMessages();

  // Проверяем текущую сессию - Supabase автоматически обрабатывает токен из URL
  async function checkSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!session) {
        showError("Invalid or expired reset link. Please request a new one.");
        if (submitButton) submitButton.disabled = true;
        return false;
      }

      return true;
    } catch (error) {
      console.error("Session check error:", error);
      showError("Invalid or expired reset link. Please request a new one.");
      if (submitButton) submitButton.disabled = true;
      return false;
    }
  }

  // Проверяем сессию при загрузке
  const hasValidSession = await checkSession();

  if (!hasValidSession) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    // Скрываем предыдущие сообщения
    hideMessages();

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput
      ? confirmPasswordInput.value
      : password;

    // Валидация пароля
    if (password.length < 6) {
      showError("Password must be at least 6 characters long");
      return;
    }

    if (confirmPasswordInput && password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    submitButton.classList.add("disabled");
    const originalValue = submitButton.value;
    submitButton.value = "Updating...";

    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      showSuccess("Password updated successfully! Redirecting to login...");

      // Очищаем форму
      form.reset();

      // Выходим из системы и редиректим на логин
      await supabaseClient.auth.signOut();

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error) {
      console.error(error);

      let errorMsg = error.message;
      if (error.message.includes("New password should be different")) {
        errorMsg = "New password must be different from the old one";
      } else if (error.message.includes("session_not_found")) {
        errorMsg = "Session expired. Please request a new reset link.";
      }

      showError(errorMsg || "An error occurred. Please try again.");
      submitButton.classList.remove("disabled");
      submitButton.value = originalValue;
    }
  });
}

// Инициализация при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordUpdate);
} else {
  initPasswordUpdate();
}
