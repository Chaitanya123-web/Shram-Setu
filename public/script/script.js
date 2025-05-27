function togglePassword(id, icon) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁️";
  }
}

function switchForm(type) {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  if (type === "signup") {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
  } else {
    signupForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  }
}