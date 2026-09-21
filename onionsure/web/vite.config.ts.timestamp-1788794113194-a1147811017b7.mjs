// vite.config.ts
import { defineConfig } from "file:///C:/Users/darak/Desktop/onion%20zip/onionsure/web/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/darak/Desktop/onion%20zip/onionsure/web/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 3e3,
    // Bind on IPv4 as well as IPv6 so http://localhost:3000 and
    // http://127.0.0.1:3000 both reach OnionSure (avoids a stale
    // IPv4 port-3000 squat from another project causing "can't connect").
    host: "0.0.0.0",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxuLy8gSW4gcHJvZHVjdGlvbiB0aGUgYmFja2VuZCBzZXJ2ZXMgdGhpcyBidWlsZCBmcm9tIHRoZSBzYW1lIG9yaWdpbi5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICAvLyBCaW5kIG9uIElQdjQgYXMgd2VsbCBhcyBJUHY2IHNvIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCBhbmRcbiAgICAvLyBodHRwOi8vMTI3LjAuMC4xOjMwMDAgYm90aCByZWFjaCBPbmlvblN1cmUgKGF2b2lkcyBhIHN0YWxlXG4gICAgLy8gSVB2NCBwb3J0LTMwMDAgc3F1YXQgZnJvbSBhbm90aGVyIHByb2plY3QgY2F1c2luZyBcImNhbid0IGNvbm5lY3RcIikuXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxuICAgICAgLy8gV2ViU29ja2V0IGxpdmUtc3luYyBlbmRwb2ludCBcdTIwMTQgcHJveGllZCBzbyB0aGUgcmVsYXRpdmUgd3M6Ly9ob3N0L3dzXG4gICAgICAvLyBVUkwgdXNlZCBieSBsaWIvcmVhbHRpbWUudHMgcmVzb2x2ZXMgdG8gdGhlIGJhY2tlbmQgaW4gZGV2IHRvby5cbiAgICAgICcvd3MnOiB7IHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjQwMDAnLCB3czogdHJ1ZSB9LFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gUGVyLXJvdXRlIGNvZGUtc3BsaXR0aW5nIChSZWFjdC5sYXp5IGluIEFwcC50c3gpIHBsdXMgZXhwbGljaXQgdmVuZG9yXG4gICAgLy8gY2h1bmtpbmcga2VlcHMgYW55IHNpbmdsZSBjaHVuayB3ZWxsIHVuZGVyIHRoZSB3YXJuaW5nIHRocmVzaG9sZC5cbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDcwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocmVhY3R8cmVhY3QtZG9tfHJlYWN0LXJvdXRlcnxyZWFjdC1yb3V0ZXItZG9tfHNjaGVkdWxlcnx1c2Utc3luYy1leHRlcm5hbC1zdG9yZSlbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLXJlYWN0JztcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlY2hhcnRzfGQzLXx2aWN0b3J5fGludGVybm1hcHxkZWNpbWFsXFwuanN8bG9kYXNofHRpbnljb2xvcjJ8cm9idXN0LXByZWRpY2F0ZXN8ZGVsYXVuYXRvcilbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWNoYXJ0cyc7XG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShmcmFtZXItbW90aW9ufG1vdGlvbi1kb218bW90aW9uLXV0aWxzfHBvcG1vdGlvbnxmcmFtZXN5bmN8c3R5bGUtdmFsdWUtdHlwZXN8QGVtb3Rpb24pW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1tb3Rpb24nO1xuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10obHVjaWRlLXJlYWN0KVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItaWNvbnMnO1xuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocXJjb2RlfHFyY29kZVxcLnJlYWN0KVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItcXInO1xuICAgICAgICAgIHJldHVybiAndmVuZG9yJztcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VSxTQUFTLG9CQUFvQjtBQUN6VyxPQUFPLFdBQVc7QUFJbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQTtBQUFBO0FBQUEsTUFHUixPQUFPLEVBQUUsUUFBUSx1QkFBdUIsSUFBSSxLQUFLO0FBQUEsSUFDbkQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUE7QUFBQTtBQUFBLElBR0wsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFnQztBQUMzQyxjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxNQUFNLDhHQUE4RyxFQUFHLFFBQU87QUFDckksY0FBSSxHQUFHLE1BQU0sd0hBQXdILEVBQUcsUUFBTztBQUMvSSxjQUFJLEdBQUcsTUFBTSxtSEFBbUgsRUFBRyxRQUFPO0FBQzFJLGNBQUksR0FBRyxNQUFNLDJDQUEyQyxFQUFHLFFBQU87QUFDbEUsY0FBSSxHQUFHLE1BQU0sbURBQW1ELEVBQUcsUUFBTztBQUMxRSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
