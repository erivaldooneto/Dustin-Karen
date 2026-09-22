const WEDDING_DATE = new Date("2026-09-26T14:00:00+02:00");

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function pad(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function initCountdown() {
  const root = $("[data-countdown]");
  if (!root) return;

  const units = {
    days: $("[data-unit='days']", root),
    hours: $("[data-unit='hours']", root),
    minutes: $("[data-unit='minutes']", root),
    seconds: $("[data-unit='seconds']", root),
  };

  const render = () => {
    const diff = WEDDING_DATE - new Date();

    if (diff <= 0) {
      units.days.textContent = "00";
      units.hours.textContent = "00";
      units.minutes.textContent = "00";
      units.seconds.textContent = "00";
      return;
    }

    const seconds = Math.floor(diff / 1000);
    units.days.textContent = pad(Math.floor(seconds / 86400));
    units.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
    units.minutes.textContent = pad(Math.floor((seconds % 3600) / 60));
    units.seconds.textContent = pad(seconds % 60);
  };

  render();
  setInterval(render, 1000);
}

function initReveal() {
  const items = $$("[data-reveal]");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((item) => observer.observe(item));
}

function initTopbar() {
  const bar = $("[data-topbar]");
  if (!bar) return;

  const update = () => {
    bar.classList.toggle("is-scrolled", window.scrollY > 40);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initScrollScenes() {
  const hero = $(".hero");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!hero || reduced) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const progress = Math.min(window.scrollY / hero.offsetHeight, 1);
    hero.style.setProperty("--hero-progress", progress.toFixed(3));
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

function initLive() {
  const frame = $("[data-live]");
  const play = $("[data-live-play]", frame || document);
  if (!frame || !play) return;

  play.addEventListener("click", () => {
    const src = frame.dataset.src;
    if (!src) return;

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Transmissão ao vivo do casamento de Dustin e Karen";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;

    frame.classList.add("is-playing");
    frame.appendChild(iframe);
  });
}

function showToast(message) {
  const toast = $("[data-toast]");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    /* falls through to legacy path */
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }

  document.body.removeChild(helper);
  return ok;
}

function initCopyButtons() {
  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyText(button.dataset.copy || "");
      const label = button.dataset.copyName || "Conteúdo";
      showToast(ok ? `${label} copiada com carinho.` : `Não foi possível copiar. Selecione manualmente.`);
    });
  });
}

const WISHES_KEY = "dk-wishes-v1";

const SEED_WISHES = [
  {
    name: "Família Fava",
    message: "Que o Senhor abençoe cada passo de vocês e faça do novo lar um lugar de paz e alegria.",
  },
  {
    name: "Vovó Inês",
    message: "Desde o Brasil, com o coração na Alemanha. Que Deus os guarde sempre juntinhos.",
  },
  {
    name: "Amigos da JMJ",
    message: "A esperança não decepciona — e o amor de vocês é prova disso. Parabéns!",
  },
];

function loadWishes() {
  try {
    const raw = localStorage.getItem(WISHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveWishes(wishes) {
  try {
    localStorage.setItem(WISHES_KEY, JSON.stringify(wishes));
  } catch (error) {
    /* storage unavailable, keep in-memory only */
  }
}

function createWishCard(wish, mine) {
  const card = document.createElement("article");
  card.className = "wish" + (mine ? " wish--mine" : "");

  const quote = document.createElement("span");
  quote.className = "wish__quote";
  quote.setAttribute("aria-hidden", "true");
  quote.textContent = "“";

  const message = document.createElement("p");
  message.className = "wish__message";
  message.textContent = wish.message;

  const author = document.createElement("p");
  author.className = "wish__author";
  author.textContent = wish.name;

  card.append(quote, message, author);
  return card;
}

function initWishes() {
  const track = $("[data-wishes-track]");
  const hint = $("[data-wishes-hint]");
  if (!track) return;

  let mine = loadWishes();

  const render = () => {
    track.innerHTML = "";

    const ordered = [...mine].reverse();
    ordered.forEach((wish) => track.appendChild(createWishCard(wish, true)));
    SEED_WISHES.forEach((wish) => track.appendChild(createWishCard(wish, false)));

    if (hint) {
      hint.hidden = track.children.length <= 1;
    }
  };

  render();

  const dialog = $("[data-wish-dialog]");
  const form = $("[data-wish-form]");
  const error = $("[data-wish-error]");
  const openButton = $("[data-open-wish]");
  const closeButton = $("[data-close-wish]");

  const closeDialog = () => {
    if (dialog && dialog.open) dialog.close();
  };

  if (openButton && dialog) {
    openButton.addEventListener("click", () => {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeDialog);
  }

  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const message = String(data.get("message") || "").trim();

      if (!name || !message) {
        if (error) error.hidden = false;
        return;
      }

      if (error) error.hidden = true;

      mine = [...mine, { name, message }];
      saveWishes(mine);
      render();
      form.reset();
      closeDialog();
      showToast("Mensagem enviada aos noivos. Obrigado!");

      const viewport = $("[data-wishes-viewport]");
      if (viewport) viewport.scrollTo({ left: 0, behavior: "smooth" });
    });
  }
}

initCountdown();
initReveal();
initTopbar();
initScrollScenes();
initLive();
initCopyButtons();
initWishes();
