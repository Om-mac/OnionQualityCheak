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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxyXG4vLyBJbiBwcm9kdWN0aW9uIHRoZSBiYWNrZW5kIHNlcnZlcyB0aGlzIGJ1aWxkIGZyb20gdGhlIHNhbWUgb3JpZ2luLlxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICAvLyBCaW5kIG9uIElQdjQgYXMgd2VsbCBhcyBJUHY2IHNvIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCBhbmRcclxuICAgIC8vIGh0dHA6Ly8xMjcuMC4wLjE6MzAwMCBib3RoIHJlYWNoIE9uaW9uU3VyZSAoYXZvaWRzIGEgc3RhbGVcclxuICAgIC8vIElQdjQgcG9ydC0zMDAwIHNxdWF0IGZyb20gYW5vdGhlciBwcm9qZWN0IGNhdXNpbmcgXCJjYW4ndCBjb25uZWN0XCIpLlxyXG4gICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiAnaHR0cDovL2xvY2FsaG9zdDo0MDAwJyxcclxuICAgICAgLy8gV2ViU29ja2V0IGxpdmUtc3luYyBlbmRwb2ludCBcdTIwMTQgcHJveGllZCBzbyB0aGUgcmVsYXRpdmUgd3M6Ly9ob3N0L3dzXHJcbiAgICAgIC8vIFVSTCB1c2VkIGJ5IGxpYi9yZWFsdGltZS50cyByZXNvbHZlcyB0byB0aGUgYmFja2VuZCBpbiBkZXYgdG9vLlxyXG4gICAgICAnL3dzJzogeyB0YXJnZXQ6ICd3czovL2xvY2FsaG9zdDo0MDAwJywgd3M6IHRydWUgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgLy8gUGVyLXJvdXRlIGNvZGUtc3BsaXR0aW5nIChSZWFjdC5sYXp5IGluIEFwcC50c3gpIHBsdXMgZXhwbGljaXQgdmVuZG9yXHJcbiAgICAvLyBjaHVua2luZyBrZWVwcyBhbnkgc2luZ2xlIGNodW5rIHdlbGwgdW5kZXIgdGhlIHdhcm5pbmcgdGhyZXNob2xkLlxyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA3MDAsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rcyhpZDogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShyZWFjdHxyZWFjdC1kb218cmVhY3Qtcm91dGVyfHJlYWN0LXJvdXRlci1kb218c2NoZWR1bGVyfHVzZS1zeW5jLWV4dGVybmFsLXN0b3JlKVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItcmVhY3QnO1xyXG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShyZWNoYXJ0c3xkMy18dmljdG9yeXxpbnRlcm5tYXB8ZGVjaW1hbFxcLmpzfGxvZGFzaHx0aW55Y29sb3IyfHJvYnVzdC1wcmVkaWNhdGVzfGRlbGF1bmF0b3IpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1jaGFydHMnO1xyXG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShmcmFtZXItbW90aW9ufG1vdGlvbi1kb218bW90aW9uLXV0aWxzfHBvcG1vdGlvbnxmcmFtZXN5bmN8c3R5bGUtdmFsdWUtdHlwZXN8QGVtb3Rpb24pW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1tb3Rpb24nO1xyXG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShsdWNpZGUtcmVhY3QpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1pY29ucyc7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHFyY29kZXxxcmNvZGVcXC5yZWFjdClbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLXFyJztcclxuICAgICAgICAgIHJldHVybiAndmVuZG9yJztcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VSxTQUFTLG9CQUFvQjtBQUN6VyxPQUFPLFdBQVc7QUFJbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQTtBQUFBO0FBQUEsTUFHUixPQUFPLEVBQUUsUUFBUSx1QkFBdUIsSUFBSSxLQUFLO0FBQUEsSUFDbkQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUE7QUFBQTtBQUFBLElBR0wsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFnQztBQUMzQyxjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxNQUFNLDhHQUE4RyxFQUFHLFFBQU87QUFDckksY0FBSSxHQUFHLE1BQU0sd0hBQXdILEVBQUcsUUFBTztBQUMvSSxjQUFJLEdBQUcsTUFBTSxtSEFBbUgsRUFBRyxRQUFPO0FBQzFJLGNBQUksR0FBRyxNQUFNLDJDQUEyQyxFQUFHLFFBQU87QUFDbEUsY0FBSSxHQUFHLE1BQU0sbURBQW1ELEVBQUcsUUFBTztBQUMxRSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
