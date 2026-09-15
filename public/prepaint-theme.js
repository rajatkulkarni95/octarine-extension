(() => {
  const theme = localStorage.getItem("octarine_theme");
  if (theme === "dark") document.documentElement.classList.add("dark");
  if (theme === "light") document.documentElement.classList.add("light");
})();
