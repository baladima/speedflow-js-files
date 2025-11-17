// Логика для Settings страницы
async function initSettings() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) return;

  // Проверяем авторизацию
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "/login";
    return;
  }

  // === ФОРМА ОБНОВЛЕНИЯ EMAIL ===
  const emailForm = document.querySelector(
    'form[form-element="update-email-form"]'
  );
  const emailSaveButton = emailForm
    ? emailForm
        .closest('[data-tabs="pane"]')
        .querySelector('[data-auth="save-button"]')
    : null;

  if (emailForm && emailSaveButton) {
    const newEmailInput = emailForm.querySelector(
      'input[form-element="email-input"]'
    );
    const emailPasswordInput = emailForm.querySelector(
      'input[form-element="password-input"]'
    );

    // Показываем текущий email как placeholder
    if (newEmailInput && session.user.email) {
      newEmailInput.placeholder = session.user.email;
    }

    // Проверка заполненности полей для активации кнопки
    function checkEmailFormFilled() {
      const newEmail = newEmailInput.value.trim();
      const password = emailPasswordInput.value;
      //   const areErrors = emailForm
      //     .closest('[data-tabs="pane"]')
      //     .querySelectorAll(".field-error");

      if (newEmail && password) {
        emailSaveButton.setAttribute("is-disabled", "false");
      } else {
        emailSaveButton.setAttribute("is-disabled", "true");
      }
    }

    // Валидация email при потере фокуса
    newEmailInput.addEventListener("blur", () => {
      const newEmail = newEmailInput.value.trim();

      if (!newEmail) {
        return; // Не показываем ошибку если поле пустое
      }

      // Проверка что email отличается
      if (newEmail === session.user.email) {
        showFieldError(
          newEmailInput,
          "New email must be different from current"
        );
        return;
      }

      // Валидация формата email
      const emailError = validateEmail(newEmail);
      if (emailError) {
        showFieldError(newEmailInput, emailError);
      }
    });

    // Валидация пароля при потере фокуса
    emailPasswordInput.addEventListener("blur", () => {
      const password = emailPasswordInput.value;

      if (!password) {
        return; // Не показываем ошибку если поле пустое
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        showFieldError(emailPasswordInput, passwordError);
      }
    });

    // Очистка ошибок и проверка заполненности при вводе
    newEmailInput.addEventListener("input", () => {
      clearFieldError(newEmailInput);
      checkEmailFormFilled();
    });
    emailPasswordInput.addEventListener("input", () => {
      clearFieldError(emailPasswordInput);
      checkEmailFormFilled();
    });

    // Обработка отправки формы
    emailSaveButton.addEventListener("click", async (e) => {
      e.preventDefault();

      // Скрываем предыдущие сообщения
      const errorMsg = emailForm
        .closest('[data-tabs="pane"]')
        .querySelector('[form-element="error-message"]');
      const successMsg = emailForm
        .closest('[data-tabs="pane"]')
        .querySelector('[form-element="success-message"]');
      if (errorMsg) errorMsg.style.display = "none";
      if (successMsg) successMsg.style.display = "none";

      clearAllFieldErrors(emailForm);

      const newEmail = newEmailInput.value.trim();
      const password = emailPasswordInput.value;

      // Валидация email
      const emailError = validateEmail(newEmail);
      if (emailError) {
        showFieldError(newEmailInput, emailError);
        return;
      }

      // Проверка что email отличается
      if (newEmail === session.user.email) {
        showFieldError(
          newEmailInput,
          "New email must be different from current"
        );
        return;
      }

      // Проверка пароля
      if (!password) {
        showFieldError(emailPasswordInput, "Password is required");
        return;
      }

      // Показываем loading
      emailSaveButton.setAttribute("disabled", "true");
      const originalText = emailSaveButton.querySelector("div").textContent;
      emailSaveButton.querySelector("div").textContent = "Saving...";

      try {
        // Сначала проверяем пароль через повторный вход
        const { error: signInError } =
          await supabaseClient.auth.signInWithPassword({
            email: session.user.email,
            password: password,
          });

        if (signInError) {
          throw new Error("Incorrect password");
        }

        // Обновляем email
        const { error: updateError } = await supabaseClient.auth.updateUser({
          email: newEmail,
        });

        if (updateError) throw updateError;

        // Показываем успех
        if (successMsg) {
          successMsg.querySelector("div").textContent =
            "Email updated successfully! Please check your new email to confirm.";
          successMsg.style.display = "block";
        }

        // Очищаем форму
        emailForm.reset();
        if (newEmailInput) {
          newEmailInput.placeholder = session.user.email;
        }

        emailSaveButton.setAttribute("is-disabled", "true");
      } catch (error) {
        console.error("Email update error:", error);
        if (errorMsg) {
          errorMsg.querySelector("div").textContent =
            error.message || "Failed to update email";
          errorMsg.style.display = "block";
        }
      } finally {
        emailSaveButton.querySelector("div").textContent = originalText;
      }
    });
  }

  // === ФОРМА СМЕНЫ ПАРОЛЯ ===
  const passwordForm = document.querySelector(
    'form[form-element="change-password-form"]'
  );
  const passwordSaveButton = passwordForm
    ? passwordForm
        .closest("[data-tabs='pane']")
        .querySelector('[data-auth="save-button"]')
    : null;

  if (passwordForm && passwordSaveButton) {
    const currentPasswordInput = passwordForm.querySelector(
      'input[form-element="current-password-input"]'
    );
    const newPasswordInput = passwordForm.querySelector(
      'input[form-element="new-password-input"]'
    );
    const confirmPasswordInput = passwordForm.querySelector(
      'input[form-element="confirm-password-input"]'
    );

    // Проверка заполненности полей для активации кнопки
    function checkPasswordFormFilled() {
      const currentPwd = currentPasswordInput.value;
      const newPwd = newPasswordInput.value;
      const confirmPwd = confirmPasswordInput.value;

      if (currentPwd && newPwd && confirmPwd) {
        passwordSaveButton.setAttribute("is-disabled", "false");
      } else {
        passwordSaveButton.setAttribute("is-disabled", "true");
      }
    }

    // Валидация текущего пароля при потере фокуса
    currentPasswordInput.addEventListener("blur", () => {
      const currentPwd = currentPasswordInput.value;

      if (!currentPwd) {
        return; // Не показываем ошибку если поле пустое
      }

      const passwordError = validatePassword(currentPwd);
      if (passwordError) {
        showFieldError(currentPasswordInput, passwordError);
      }
    });

    // Валидация нового пароля при потере фокуса
    newPasswordInput.addEventListener("blur", () => {
      const newPwd = newPasswordInput.value;
      const currentPwd = currentPasswordInput.value;

      if (!newPwd) {
        return; // Не показываем ошибку если поле пустое
      }

      // Проверка минимальной длины
      const passwordError = validatePassword(newPwd);
      if (passwordError) {
        showFieldError(newPasswordInput, passwordError);
        return;
      }

      // Проверка что новый пароль отличается от текущего
      if (currentPwd && newPwd === currentPwd) {
        showFieldError(
          newPasswordInput,
          "New password must be different from current"
        );
      }
    });

    // Валидация подтверждения пароля при потере фокуса
    confirmPasswordInput.addEventListener("blur", () => {
      const newPwd = newPasswordInput.value;
      const confirmPwd = confirmPasswordInput.value;

      if (!confirmPwd) {
        return; // Не показываем ошибку если поле пустое
      }

      // Проверка совпадения паролей
      if (newPwd !== confirmPwd) {
        showFieldError(confirmPasswordInput, "Passwords do not match");
      }
    });

    // Очистка ошибок и проверка заполненности при вводе
    currentPasswordInput.addEventListener("input", () => {
      clearFieldError(currentPasswordInput);
      checkPasswordFormFilled();
    });
    newPasswordInput.addEventListener("input", () => {
      clearFieldError(newPasswordInput);
      checkPasswordFormFilled();
    });
    confirmPasswordInput.addEventListener("input", () => {
      clearFieldError(confirmPasswordInput);
      checkPasswordFormFilled();
    });

    // Обработка отправки формы
    passwordSaveButton.addEventListener("click", async (e) => {
      e.preventDefault();

      // Скрываем предыдущие сообщения
      const errorMsg = passwordForm
        .closest("[data-tabs='pane']")
        .querySelector('[form-element="error-message"]');
      const successMsg = passwordForm
        .closest("[data-tabs='pane']")
        .querySelector('[form-element="success-message"]');
      if (errorMsg) errorMsg.style.display = "none";
      if (successMsg) successMsg.style.display = "none";

      clearAllFieldErrors(passwordForm);

      const currentPwd = currentPasswordInput.value;
      const newPwd = newPasswordInput.value;
      const confirmPwd = confirmPasswordInput.value;

      // Валидация текущего пароля
      if (!currentPwd) {
        showFieldError(currentPasswordInput, "Current password is required");
        return;
      }

      // Валидация нового пароля
      const newPwdError = validatePassword(newPwd);
      if (newPwdError) {
        showFieldError(newPasswordInput, newPwdError);
        return;
      }

      // Проверка что новый пароль отличается
      if (newPwd === currentPwd) {
        showFieldError(
          newPasswordInput,
          "New password must be different from current"
        );
        return;
      }

      // Проверка подтверждения
      if (!confirmPwd) {
        showFieldError(confirmPasswordInput, "Please confirm your password");
        return;
      }

      if (newPwd !== confirmPwd) {
        showFieldError(confirmPasswordInput, "Passwords do not match");
        return;
      }

      // Показываем loading
      passwordSaveButton.setAttribute("is-disabled", "true");
      const originalText = passwordSaveButton.querySelector("div").textContent;
      passwordSaveButton.querySelector("div").textContent = "Saving...";

      try {
        // Проверяем текущий пароль
        const { error: signInError } =
          await supabaseClient.auth.signInWithPassword({
            email: session.user.email,
            password: currentPwd,
          });

        if (signInError) {
          throw new Error("Current password is incorrect");
        }

        // Обновляем пароль
        const { error: updateError } = await supabaseClient.auth.updateUser({
          password: newPwd,
        });

        if (updateError) throw updateError;

        // Показываем успех
        if (successMsg) {
          successMsg.textContent = "Password changed successfully!";
          successMsg.style.display = "block";
        }

        // Очищаем форму
        passwordForm.reset();
        passwordSaveButton.setAttribute("is-disabled", "true");
      } catch (error) {
        console.error("Password change error:", error);
        console.log("errorMsg -->", errorMsg);
        if (errorMsg) {
          errorMsg.querySelector("div").textContent =
            error.message || "Failed to change password";
          errorMsg.style.display = "block";
        }
      } finally {
        passwordSaveButton.querySelector("div").textContent = originalText;
      }
    });
  }
}

// Инициализация при загрузке страницы
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSettings);
} else {
  initSettings();
}
