// auth.js

function toggleForms() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const message = document.getElementById("message");

    loginForm.classList.toggle("hidden");
    signupForm.classList.toggle("hidden");
    message.textContent = "";
}

// Optional: Form submit handlers (you can connect to backend)
document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const email = this.email.value;
    const password = this.password.value;

    // Simulated login (replace with real validation)
    if (email === "test@example.com" && password === "123456") {
        localStorage.setItem("isLoggedIn", "true");
        document.getElementById("message").textContent = "Login successful! Redirecting...";
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);
    } else {
        document.getElementById("message").textContent = "Invalid email or password.";
    }
});

document.getElementById("signup-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const password = this.password.value;
    const confirm = this.confirm.value;

    if (password !== confirm) {
        document.getElementById("message").textContent = "Passwords do not match.";
        return;
    }

    // Simulated signup
    document.getElementById("message").textContent = "Signup successful! You can now log in.";
    setTimeout(() => {
        toggleForms();
    }, 1500);
});
