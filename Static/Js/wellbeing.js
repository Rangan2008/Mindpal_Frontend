// wellbeing.js

document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("bubble");
  const quote = document.getElementById("daily-quote");

  // Breathing animation
  window.startBreathing = function () {
    bubble.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.6)" },
      { transform: "scale(1)" }
    ], {
      duration: 8000,
      iterations: Infinity
    });
  };

  // Fetch a motivational quote
  fetch("https://api.quotable.io/random?tags=motivational|inspirational")
    .then(res => res.json())
    .then(data => {
      quote.textContent = `"${data.content}" — ${data.author}`;
    })
    .catch(() => {
      quote.textContent = "You're doing great. Keep going!";
    });
});


    const tips = [
      "Drink a glass of water slowly.",
      "Take a 5-minute walk outside.",
      "Stretch your arms and legs.",
      "Write down 3 things you love.",
      "Listen to calming music."
    ];
    let tipIndex = 0;

    function nextTip() {
      tipIndex = (tipIndex + 1) % tips.length;
      document.getElementById("tip-display").textContent = tips[tipIndex];
    }

    let gratCount = 0;
    function incrementGratitude() {
      gratCount++;
      document.getElementById("grat-count").textContent = gratCount;
    }