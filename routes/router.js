// const routes = {
//   "/login": "../login_page.html",
//   "/signup": "../signup_page.html", 
// };

// const app = document.getElementById("app");

// // Load page based on hash
// function loadPage() {
//   const path = location.hash.replace("#", "") || "/login";
//   const route = routes[path] || routes["/login"];

//   fetch(route)
//     .then(res => res.text())
//     .then(html => {
//       app.innerHTML = html;
//     });
// }

// // Navigate using hash (NO reload)
// function navigateTo(path) {
//   location.hash = path;
// }

// // Handle link clicks
// document.addEventListener("click", (e) => {
//   const link = e.target.closest("[data-link]");
//   if (!link) return;

//   e.preventDefault();
//   navigateTo(link.getAttribute("href"));
// });

// // Load on page load and hash change
// window.addEventListener("hashchange", loadPage);
// window.addEventListener("load", loadPage);



