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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxyXG4vLyBJbiBwcm9kdWN0aW9uIHRoZSBiYWNrZW5kIHNlcnZlcyB0aGlzIGJ1aWxkIGZyb20gdGhlIHNhbWUgb3JpZ2luLlxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxyXG4gICAgICAvLyBXZWJTb2NrZXQgbGl2ZS1zeW5jIGVuZHBvaW50IFx1MjAxNCBwcm94aWVkIHNvIHRoZSByZWxhdGl2ZSB3czovL2hvc3Qvd3NcclxuICAgICAgLy8gVVJMIHVzZWQgYnkgbGliL3JlYWx0aW1lLnRzIHJlc29sdmVzIHRvIHRoZSBiYWNrZW5kIGluIGRldiB0b28uXHJcbiAgICAgICcvd3MnOiB7IHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjQwMDAnLCB3czogdHJ1ZSB9LFxyXG4gICAgICAvLyBDaGF0Ym90IHRleHQgQVBJIFx1MjAxNCBwcm94aWVkIHRvIFBpcGVjYXQgc2VydmVyIChwb3J0IDg3NjUpXHJcbiAgICAgIC8vIE9ubHkgYWN0aXZlIHdoZW4gVklURV9CT1RfVVJMIGlzIG5vdCBzZXQgdG8gYW4gZXh0ZXJuYWwgVVJMLlxyXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCBzZXQgVklURV9CT1RfVVJMIHRvIHRoZSBkZXBsb3llZCBjaGF0Ym90IHNlcnZlciBVUkwuXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgZGVmaW5lOiB7XHJcbiAgICAvLyBCb3Qgc2VydmVyIFVSTCBcdTIwMTQgb3ZlcnJpZGUgd2l0aCBWSVRFX0JPVF9VUkwgZW52IHZhciBmb3IgcHJvZHVjdGlvblxyXG4gICAgLy8gRGVmYXVsdDogaHR0cDovL2xvY2FsaG9zdDo4NzY1IChQaXBlY2F0IGNoYXRib3Qgc2VydmVyKVxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNzAwLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3MoaWQ6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocmVhY3R8cmVhY3QtZG9tfHJlYWN0LXJvdXRlcnxyZWFjdC1yb3V0ZXItZG9tfHNjaGVkdWxlcnx1c2Utc3luYy1leHRlcm5hbC1zdG9yZSlbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLXJlYWN0JztcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocmVjaGFydHN8ZDMtfHZpY3Rvcnl8aW50ZXJubWFwfGRlY2ltYWxcXC5qc3xsb2Rhc2h8dGlueWNvbG9yMnxyb2J1c3QtcHJlZGljYXRlc3xkZWxhdW5hdG9yKVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItY2hhcnRzJztcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10oZnJhbWVyLW1vdGlvbnxtb3Rpb24tZG9tfG1vdGlvbi11dGlsc3xwb3Btb3Rpb258ZnJhbWVzeW5jfHN0eWxlLXZhbHVlLXR5cGVzfEBlbW90aW9uKVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItbW90aW9uJztcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10obHVjaWRlLXJlYWN0KVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItaWNvbnMnO1xyXG4gICAgICAgICAgaWYgKGlkLm1hdGNoKC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXShxcmNvZGV8cXJjb2RlXFwucmVhY3QpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1xcic7XHJcbiAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFUsU0FBUyxvQkFBb0I7QUFDelcsT0FBTyxXQUFXO0FBSWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUE7QUFBQTtBQUFBLE1BR1IsT0FBTyxFQUFFLFFBQVEsdUJBQXVCLElBQUksS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBLElBSW5EO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBO0FBQUE7QUFBQSxFQUdSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQWdDO0FBQzNDLGNBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDekMsY0FBSSxHQUFHLE1BQU0sOEdBQThHLEVBQUcsUUFBTztBQUNySSxjQUFJLEdBQUcsTUFBTSx3SEFBd0gsRUFBRyxRQUFPO0FBQy9JLGNBQUksR0FBRyxNQUFNLG1IQUFtSCxFQUFHLFFBQU87QUFDMUksY0FBSSxHQUFHLE1BQU0sMkNBQTJDLEVBQUcsUUFBTztBQUNsRSxjQUFJLEdBQUcsTUFBTSxtREFBbUQsRUFBRyxRQUFPO0FBQzFFLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
