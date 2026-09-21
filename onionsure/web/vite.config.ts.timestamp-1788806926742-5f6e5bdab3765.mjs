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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYXJha1xcXFxEZXNrdG9wXFxcXG9uaW9uIHppcFxcXFxvbmlvbnN1cmVcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYXJhay9EZXNrdG9wL29uaW9uJTIwemlwL29uaW9uc3VyZS93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbi8vIERldiBzZXJ2ZXIgcHJveGllcyAvYXBpIHRvIHRoZSBPbmlvblN1cmUgRXhwcmVzcyBiYWNrZW5kIChwb3J0IDQwMDApLlxyXG4vLyBJbiBwcm9kdWN0aW9uIHRoZSBiYWNrZW5kIHNlcnZlcyB0aGlzIGJ1aWxkIGZyb20gdGhlIHNhbWUgb3JpZ2luLlxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHBvcnQ6IDMwMDAsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxyXG4gICAgICAvLyBXZWJTb2NrZXQgbGl2ZS1zeW5jIGVuZHBvaW50IFx1MjAxNCBwcm94aWVkIHNvIHRoZSByZWxhdGl2ZSB3czovL2hvc3Qvd3NcclxuICAgICAgLy8gVVJMIHVzZWQgYnkgbGliL3JlYWx0aW1lLnRzIHJlc29sdmVzIHRvIHRoZSBiYWNrZW5kIGluIGRldiB0b28uXHJcbiAgICAgICcvd3MnOiB7IHRhcmdldDogJ3dzOi8vbG9jYWxob3N0OjQwMDAnLCB3czogdHJ1ZSB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICAvLyBQZXItcm91dGUgY29kZS1zcGxpdHRpbmcgKFJlYWN0LmxhenkgaW4gQXBwLnRzeCkgcGx1cyBleHBsaWNpdCB2ZW5kb3JcclxuICAgIC8vIGNodW5raW5nIGtlZXBzIGFueSBzaW5nbGUgY2h1bmsgd2VsbCB1bmRlciB0aGUgd2FybmluZyB0aHJlc2hvbGQuXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDcwMCxcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlYWN0fHJlYWN0LWRvbXxyZWFjdC1yb3V0ZXJ8cmVhY3Qtcm91dGVyLWRvbXxzY2hlZHVsZXJ8dXNlLXN5bmMtZXh0ZXJuYWwtc3RvcmUpW1xcXFwvXS8pKSByZXR1cm4gJ3ZlbmRvci1yZWFjdCc7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKHJlY2hhcnRzfGQzLXx2aWN0b3J5fGludGVybm1hcHxkZWNpbWFsXFwuanN8bG9kYXNofHRpbnljb2xvcjJ8cm9idXN0LXByZWRpY2F0ZXN8ZGVsYXVuYXRvcilbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWNoYXJ0cyc7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKGZyYW1lci1tb3Rpb258bW90aW9uLWRvbXxtb3Rpb24tdXRpbHN8cG9wbW90aW9ufGZyYW1lc3luY3xzdHlsZS12YWx1ZS10eXBlc3xAZW1vdGlvbilbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLW1vdGlvbic7XHJcbiAgICAgICAgICBpZiAoaWQubWF0Y2goL1tcXFxcL11ub2RlX21vZHVsZXNbXFxcXC9dKGx1Y2lkZS1yZWFjdClbXFxcXC9dLykpIHJldHVybiAndmVuZG9yLWljb25zJztcclxuICAgICAgICAgIGlmIChpZC5tYXRjaCgvW1xcXFwvXW5vZGVfbW9kdWxlc1tcXFxcL10ocXJjb2RlfHFyY29kZVxcLnJlYWN0KVtcXFxcL10vKSkgcmV0dXJuICd2ZW5kb3ItcXInO1xyXG4gICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRVLFNBQVMsb0JBQW9CO0FBQ3pXLE9BQU8sV0FBVztBQUlsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBO0FBQUE7QUFBQSxNQUdSLE9BQU8sRUFBRSxRQUFRLHVCQUF1QixJQUFJLEtBQUs7QUFBQSxJQUNuRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQTtBQUFBO0FBQUEsSUFHTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQWdDO0FBQzNDLGNBQUksQ0FBQyxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDekMsY0FBSSxHQUFHLE1BQU0sOEdBQThHLEVBQUcsUUFBTztBQUNySSxjQUFJLEdBQUcsTUFBTSx3SEFBd0gsRUFBRyxRQUFPO0FBQy9JLGNBQUksR0FBRyxNQUFNLG1IQUFtSCxFQUFHLFFBQU87QUFDMUksY0FBSSxHQUFHLE1BQU0sMkNBQTJDLEVBQUcsUUFBTztBQUNsRSxjQUFJLEdBQUcsTUFBTSxtREFBbUQsRUFBRyxRQUFPO0FBQzFFLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
