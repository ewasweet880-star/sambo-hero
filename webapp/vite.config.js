import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // доступно и для превью, и с телефона в локальной сети
    allowedHosts: true, // dev-only: разрешить любой хост (для превью/туннелей)
    proxy: { "/api": "http://localhost:3000" }, // для локальной разработки
  },
});
