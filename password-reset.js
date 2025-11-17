// Логика для страницы запроса восстановления пароля
async function initPasswordReset() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  const form = document.querySelector('form[form-element="form"]');
  if (!form) {
    console.error("Password reset form not found");
    return;
  }

  const emailInput = form.querySelector('input[form-element="email-input"]');
  const submitButton = form.querySelector('input[type="submit"]');

  // Скрываем сообщения при загрузке
  hideMessages();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    // Скрываем предыдущие сообщения
    hideMessages();

    submitButton.classList.add("disabled");
    const originalValue = submitButton.value;
    submitButton.value = "Sending...";

    const email = emailInput.value;

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;

      showSuccess(
        "Password reset link has been sent to your email. Please check your inbox."
      );

      // Очищаем форму
      form.reset();
    } catch (error) {
      console.error(error);
      showError(error.message || "An error occurred. Please try again.");
    } finally {
      submitButton.classList.remove("disabled");
      submitButton.value = originalValue;
    }
  });
}

// Инициализация при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordReset);
} else {
  initPasswordReset();
}
