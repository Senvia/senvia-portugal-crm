// vite.config.ts
import { defineConfig } from "file:///C:/Users/ThiagoSousa/senvia-recurring/node_modules/.deno/vite@5.4.21/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ThiagoSousa/senvia-recurring/node_modules/.deno/@vitejs+plugin-react-swc@3.11.0/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/ThiagoSousa/senvia-recurring/node_modules/.deno/lovable-tagger@1.3.3/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\ThiagoSousa\\senvia-recurring";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run/")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/@supabase/") || id.includes("node_modules/postgres-js/")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-motion";
          }
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod") || id.includes("node_modules/@hookform/")) {
            return "vendor-forms";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "vendor-icons";
          }
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUaGlhZ29Tb3VzYVxcXFxzZW52aWEtcmVjdXJyaW5nXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUaGlhZ29Tb3VzYVxcXFxzZW52aWEtcmVjdXJyaW5nXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9UaGlhZ29Tb3VzYS9zZW52aWEtcmVjdXJyaW5nL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBQV0EgcGx1Z2luIHJlbW92ZWQgaW50ZW50aW9uYWxseSBcdTIwMTQgd2FzIGNhdXNpbmcgc3RhbGUgc2hlbGxzIChjYWNoZWQgb2xkXHJcbi8vIGJ1aWxkcyBwcmV2ZW50ZWQgdXNlcnMgZnJvbSByZWNlaXZpbmcgbmV3IGZlYXR1cmVzIGxpa2UgdGhlIEltcG9ydGFyIGJ1dHRvbikuXHJcbi8vIEluc3RhbGxhYmlsaXR5IGlzIHByZXNlcnZlZCB2aWEgc3RhdGljIC9tYW5pZmVzdC53ZWJtYW5pZmVzdCArIC9zdy5qc1xyXG4vLyBraWxsLXN3aXRjaCBpbiAvcHVibGljLlxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogdHJ1ZSxcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcclxuICAgICAgICAgIC8vIFJlYWN0IGNvcmUgXHUyMDE0IHRpbnkgYnV0IGxvYWRlZCBmaXJzdFxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3JlYWN0L1wiKSB8fCBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1kb20vXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3NjaGVkdWxlci9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJlYWN0XCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBSZWFjdCBSb3V0ZXJcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXJcIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvQHJlbWl4LXJ1bi9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJvdXRlclwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gVGFuU3RhY2sgKFJlYWN0IFF1ZXJ5ICsgVmlydHVhbClcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9AdGFuc3RhY2svXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1xdWVyeVwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gU3VwYWJhc2VcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9Ac3VwYWJhc2UvXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3Bvc3RncmVzLWpzL1wiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3Itc3VwYWJhc2VcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFJhZGl4IFVJIHByaW1pdGl2ZXMgKGhlYXZ5IFx1MjAxNCBzcGxpdCBmcm9tIHRoZSByZXN0KVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL0ByYWRpeC11aS9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXJhZGl4XCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBGcmFtZXIgTW90aW9uXHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvZnJhbWVyLW1vdGlvbi9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLW1vdGlvblwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gRm9ybXMgKHJlYWN0LWhvb2stZm9ybSArIHpvZCArIHJlc29sdmVycylcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9yZWFjdC1ob29rLWZvcm1cIikgfHwgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvem9kXCIpIHx8IGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL0Bob29rZm9ybS9cIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWZvcm1zXCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBMdWNpZGUgaWNvbnNcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3QvXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1pY29uc1wiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5UyxTQUFTLG9CQUFvQjtBQUN0VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBU3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxpQkFBaUIsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUM5RSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjLENBQUMsT0FBTztBQUVwQixjQUFJLEdBQUcsU0FBUyxxQkFBcUIsS0FBSyxHQUFHLFNBQVMseUJBQXlCLEtBQUssR0FBRyxTQUFTLHlCQUF5QixHQUFHO0FBQzFILG1CQUFPO0FBQUEsVUFDVDtBQUVBLGNBQUksR0FBRyxTQUFTLDJCQUEyQixLQUFLLEdBQUcsU0FBUywwQkFBMEIsR0FBRztBQUN2RixtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyx5QkFBeUIsR0FBRztBQUMxQyxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyx5QkFBeUIsS0FBSyxHQUFHLFNBQVMsMkJBQTJCLEdBQUc7QUFDdEYsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMseUJBQXlCLEdBQUc7QUFDMUMsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsNkJBQTZCLEdBQUc7QUFDOUMsbUJBQU87QUFBQSxVQUNUO0FBRUEsY0FBSSxHQUFHLFNBQVMsOEJBQThCLEtBQUssR0FBRyxTQUFTLGtCQUFrQixLQUFLLEdBQUcsU0FBUyx5QkFBeUIsR0FBRztBQUM1SCxtQkFBTztBQUFBLFVBQ1Q7QUFFQSxjQUFJLEdBQUcsU0FBUyw0QkFBNEIsR0FBRztBQUM3QyxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
