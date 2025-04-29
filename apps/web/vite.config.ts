import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import themePlugin from "@replit/vite-plugin-shadcn-theme-json"; // Keep if needed, otherwise remove
import path from "path";
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; // Keep if needed, otherwise remove

// Assuming this config is now inside apps/web/

export default defineConfig({
  plugins: [
    react(),
    // Only include these if they are relevant for the web app build context
    // runtimeErrorOverlay(), 
    // themePlugin(),
    // Remove cartographer or adjust its logic if needed for this specific app
    // ...(process.env.NODE_ENV !== "production" && ... ), 
  ],
  resolve: {
    alias: {
      // Adjust paths relative to apps/web directory
      // Assuming shared is at ../../shared and attached_assets at ../../attached_assets
      "@": path.resolve(__dirname, "src"), 
      "@shared": path.resolve(__dirname, "..", "..", "shared"), 
      "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
    },
  },
  // Remove root setting, Vite will use the current directory (apps/web) as root
  // root: path.resolve(import.meta.dirname, "client"), 
  
  // publicDir defaults to 'public' within the root, check if apps/web/public exists
  // publicDir: path.resolve(import.meta.dirname, "client/public"), 

  build: {
    // outDir defaults to 'dist' within the root (apps/web/dist)
    outDir: 'dist', 
    emptyOutDir: true,
    assetsDir: "assets", // Default is usually fine
    rollupOptions: { // Keep rollup options if they are still valid
      output: {
        // manualChunks: {
        //   vendor: ['react', 'react-dom', 'react-hook-form', 'react-icons', 'wouter'],
        //   ui: ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 
        //        '@radix-ui/react-label', '@radix-ui/react-popover', '@radix-ui/react-select', 
        //        '@radix-ui/react-slot', 'class-variance-authority', 'tailwind-merge'],
        //   charts: ['chart.js', 'react-chartjs-2', 'recharts'],
        //   utils: ['zod', 'date-fns', 'clsx']
        // }
      }
    },
    sourcemap: true, // Consider disabling for production to reduce size
    minify: true,
    chunkSizeWarningLimit: 1000 // Adjust if needed
  },
}); 