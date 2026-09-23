import { useEffect, useState } from "react";

export function useTheme() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* private mode etc. — theme just won't persist */
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
