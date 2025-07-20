// music.js

document.addEventListener("DOMContentLoaded", () => {
  const quoteEl = document.getElementById("daily-quote");

  // Fetch motivational quote
  fetch("https://api.quotable.io/random?tags=motivational|inspirational")
    .then(res => res.json())
    .then(data => {
      quoteEl.textContent = `"${data.content}" — ${data.author}`;
    })
    .catch(() => {
      quoteEl.textContent = "You are stronger than you think. 🎧";
    });
});

document.addEventListener("DOMContentLoaded", () => {
  const quoteEl = document.getElementById("daily-quote");

  fetch("https://api.quotable.io/random?tags=motivational|inspirational")
    .then(res => res.json())
    .then(data => {
      quoteEl.textContent = `"${data.content}" — ${data.author}`;
    })
    .catch(() => {
      quoteEl.textContent = "You are stronger than you think. 🎧";
    });
});
