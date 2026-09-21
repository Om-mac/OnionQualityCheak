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
      // Chatbot text API — proxied to Pipecat server (port 8765)
      // Only active when VITE_BOT_URL is not set to an external URL.
      // In production, set VITE_BOT_URL to the deployed chatbot server URL.
    }
  },
  define: {
    // Bot server URL — override with VITE_BOT_URL env var for production
    // Default: http://localhost:8765 (Pipecat chatbot server)
  },
  build: {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxyXG4vLyBJbiBwcm9kdWN0aW9uIHRoZSBiYWNrZW5kIHNlcnZlcyB0aGlzIGJ1aWxkIGZyb20gdGhlIHNhbWUgb3JpZ2luLlxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICAvLyBCaW5kIG9uIElQdjQgYXMgd2VsbCBhcyBJUHY2IHNvIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCBhbmRcclxuICAgIC8vIGh0dHA6Ly8xMjcuMC4wLjE6MzAwMCBib3RoIHJlYWNoIE9uaW9uU3VyZSAoYXZvaWRzIGEgc3RhbGVcclxuICAgIC8vIElQdjQgcG9ydC0zMDAwIHNxdWF0IGZyb20gYW5vdGhlciBwcm9qZWN0IGNhdXNpbmcgXCJjYW4ndCBjb25uZWN0XCIpLlxyXG4gICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiAnaHR0cDovL2xvY2FsaG9zdDo0MDAwJyxcclxuICAgICAgLy8gV2ViU29ja2V0IGxpdmUtc3luYyBlbmRwb2ludCBcdTIwMTQgcHJveGllZCBzbyB0aGUgcmVsYXRpdmUgd3M6Ly9ob3N0L3dzXHJcbiAgICAgIC8vIFVSTCB1c2VkIGJ5IGxpYi9yZWFsdGltZS50cyByZXNvbHZlcyB0byB0aGUgYmFja2VuZCBpbiBkZXYgdG9vLlxyXG4gICAgICAnL3dzJzogeyB0YXJnZXQ6ICd3czovL2xvY2FsaG9zdDo0MDAwJywgd3M6IHRydWUgfSxcclxuICAgICAgLy8gQ2hhdGJvdCB0ZXh0IEFQSSBcdTIwMTQgcHJveGllZCB0byBQaXBlY2F0IHNlcnZlciAocG9ydCA4NzY1KVxyXG4gICAgICAvLyBPbmx5IGFjdGl2ZSB3aGVuIFZJVEVfQk9UX1VSTCBpcyBub3Qgc2V0IHRvIGFuIGV4dGVybmFsIFVSTC5cclxuICAgICAgLy8gSW4gcHJvZHVjdGlvbiwgc2V0IFZJVEVfQk9UX1VSTCB0byB0aGUgZGVwbG95ZWQgY2hhdGJvdCBzZXJ2ZXIgVVJMLlxyXG4gICAgfSxcclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgLy8gQm90IHNlcnZlciBVUkwgXHUyMDE0IG92ZXJyaWRlIHdpdGggVklURV9CT1RfVVJMIGVudiB2YXIgZm9yIHByb2R1Y3Rpb25cclxuICAgIC8vIERlZmF1bHQ6IGh0dHA6Ly9sb2NhbGhvc3Q6ODc2NSAoUGlwZWNhdCBjaGF0Ym90IHNlcnZlcilcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDcwMCxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlYWN0fHJlYWN0LWRvbXxyZWFjdC1yb3V0ZXJ8cmVhY3Qtcm91dGVyLWRvbXxzY2hlZHVsZXJ8dXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlY2hhcnRzfGQzLXx2aWN0b3J5fGludGVybm1hcHxkZWNpbWFsXFwuanN8bG9kYXNofHRpbnljb2xvcjJ8cm9idXN0LXByZWRpY2F0ZXN8ZGVsYXVuYXRvcilbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWNoYXJ0cyc7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKGZyYW1lci1tb3Rpb258bW90aW9uLWRvbXxtb3Rpb24tdXRpbHN8cG9wbW90aW9ufGZyYW1lc3luY3xzdHlsZS12YWx1ZS10eXBlc3xAZW1vdGlvbilbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLW1vdGlvbic7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKGx1Y2lkZS1yZWFjdClbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWljb25zJztcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocXJjb2RlfHFyY29kZVxcLnJlYWN0KVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItcXInO1xyXG4gICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRVLFNBQVMsb0JBQW9CO0FBQ3pXLE9BQU8sV0FBVztBQUlsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBSU4sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBO0FBQUE7QUFBQSxNQUdSLE9BQU8sRUFBRSxRQUFRLHVCQUF1QixJQUFJLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUluRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQTtBQUFBO0FBQUEsRUFHUjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFnQztBQUMzQyxjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxNQUFNLDhHQUE4RyxFQUFHLFFBQU87QUFDckksY0FBSSxHQUFHLE1BQU0sd0hBQXdILEVBQUcsUUFBTztBQUMvSSxjQUFJLEdBQUcsTUFBTSxtSEFBbUgsRUFBRyxRQUFPO0FBQzFJLGNBQUksR0FBRyxNQUFNLDJDQUEyQyxFQUFHLFFBQU87QUFDbEUsY0FBSSxHQUFHLE1BQU0sbURBQW1ELEVBQUcsUUFBTztBQUMxRSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
