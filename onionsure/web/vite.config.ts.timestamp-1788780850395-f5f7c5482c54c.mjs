// vite.config.ts
import { defineConfig } from "file:///C:/Users/darak/Desktop/onion%20zip/onionsure/web/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/darak/Desktop/onion%20zip/onionsure/web/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 3e3,
    proxy: {
      "/api": "http://localhost:4000",
      // WebSocket live-sync endpoint — proxied so the relative ws://host/ws
      // URL used by lib/realtime.ts resolves to the backend in dev too.
      "/ws": { target: "ws://localhost:4000", ws: true }
    }
  },
  build: {
    // Per-route code-splitting (React.lazy in App.tsx) plus explicit vendor
    // chunking keeps any single chunk well under the warning threshold.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return void 0;
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[\\/]/)) return "vendor-react";
          if (id.match(/[\\/]node_modules[\\/](recharts|d3-|victory|internmap|decimal\.js|lodash|tinycolor2|robust-predicates|delaunator)[\\/]/)) return "vendor-charts";
          if (id.match(/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|popmotion|framesync|style-value-types|@emotion)[\\/]/)) return "vendor-motion";
          if (id.match(/[\\/]node_modules[\\/](lucide-react)[\\/]/)) return "vendor-icons";
          if (id.match(/[\\/]node_modules[\\/](qrcode|qrcode\.react)[\\/]/)) return "vendor-qr";
          return "vendor";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxuLy8gSW4gcHJvZHVjdGlvbiB0aGUgYmFja2VuZCBzZXJ2ZXMgdGhpcyBidWlsZCBmcm9tIHRoZSBzYW1lIG9yaWdpbi5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiAnaHR0cDovL2xvY2FsaG9zdDo0MDAwJyxcbiAgICAgIC8vIFdlYlNvY2tldCBsaXZlLXN5bmMgZW5kcG9pbnQgXHUyMDE0IHByb3hpZWQgc28gdGhlIHJlbGF0aXZlIHdzOi8vaG9zdC93c1xuICAgICAgLy8gVVJMIHVzZWQgYnkgbGliL3JlYWx0aW1lLnRzIHJlc29sdmVzIHRvIHRoZSBiYWNrZW5kIGluIGRldiB0b28uXG4gICAgICAnL3dzJzogeyB0YXJnZXQ6ICd3czovL2xvY2FsaG9zdDo0MDAwJywgd3M6IHRydWUgfSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIC8vIFBlci1yb3V0ZSBjb2RlLXNwbGl0dGluZyAoUmVhY3QubGF6eSBpbiBBcHAudHN4KSBwbHVzIGV4cGxpY2l0IHZlbmRvclxuICAgIC8vIGNodW5raW5nIGtlZXBzIGFueSBzaW5nbGUgY2h1bmsgd2VsbCB1bmRlciB0aGUgd2FybmluZyB0aHJlc2hvbGQuXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA3MDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZDogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlYWN0fHJlYWN0LWRvbXxyZWFjdC1yb3V0ZXJ8cmVhY3Qtcm91dGVyLWRvbXxzY2hlZHVsZXJ8dXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShyZWNoYXJ0c3xkMy18dmljdG9yeXxpbnRlcm5tYXB8ZGVjaW1hbFxcLmpzfGxvZGFzaHx0aW55Y29sb3IyfHJvYnVzdC1wcmVkaWNhdGVzfGRlbGF1bmF0b3IpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1jaGFydHMnO1xuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10oZnJhbWVyLW1vdGlvbnxtb3Rpb24tZG9tfG1vdGlvbi11dGlsc3xwb3Btb3Rpb258ZnJhbWVzeW5jfHN0eWxlLXZhbHVlLXR5cGVzfEBlbW90aW9uKVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItbW90aW9uJztcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKGx1Y2lkZS1yZWFjdClbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWljb25zJztcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHFyY29kZXxxcmNvZGVcXC5yZWFjdClbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLXFyJztcbiAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFUsU0FBUyxvQkFBb0I7QUFDelcsT0FBTyxXQUFXO0FBSWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUE7QUFBQTtBQUFBLE1BR1IsT0FBTyxFQUFFLFFBQVEsdUJBQXVCLElBQUksS0FBSztBQUFBLElBQ25EO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUE7QUFBQSxJQUdMLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBZ0M7QUFDM0MsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQUN6QyxjQUFJLEdBQUcsTUFBTSw4R0FBOEcsRUFBRyxRQUFPO0FBQ3JJLGNBQUksR0FBRyxNQUFNLHdIQUF3SCxFQUFHLFFBQU87QUFDL0ksY0FBSSxHQUFHLE1BQU0sbUhBQW1ILEVBQUcsUUFBTztBQUMxSSxjQUFJLEdBQUcsTUFBTSwyQ0FBMkMsRUFBRyxRQUFPO0FBQ2xFLGNBQUksR0FBRyxNQUFNLG1EQUFtRCxFQUFHLFFBQU87QUFDMUUsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
