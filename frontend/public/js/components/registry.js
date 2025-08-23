// Tiny hash router to highlight top nav and switch sections.
export function setupRouter() {
  const nav = document.querySelector(".tk-appbar__nav");
  const routes = [...document.querySelectorAll(".route")];

  const activate = (hash) => {
    const id = (hash || "#home").replace(/^#?/, "#");
    routes.forEach((sec) =>
      sec.classList.toggle("route--active", `#${sec.id}` === id),
    );
    nav?.querySelectorAll("a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === id);
    });
  };

  window.addEventListener("hashchange", () => activate(location.hash));
  activate(location.hash || "#home");
}
