import { serve, file, $ } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/files": {
      async GET(req) {
        const url = new URL(req.url);
        const path = url.searchParams.get("path") || ".";
        
        try {
          const files = await $`bash -c "ls -la ${path}"`.text();
          const lines = files.split("\n").filter(Boolean);
          
          const fileList = lines.slice(1).map(line => {
            const parts = line.split(/\s+/);
            const permissions = parts[0] || "";
            const isDirectory = permissions.startsWith("d");
            // Handle names that might contain spaces by taking everything after the 8th field
            const name = parts.slice(8).join(" ");
            return {
              name,
              isDirectory,
              permissions
            };
          }).filter(item => item.name && item.name !== "." && item.name !== "..");
          
          return Response.json({ 
            files: fileList,
            currentPath: path
          });
        } catch (error) {
          return Response.json({ 
            error: "Failed to read directory",
            message: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
      }
    },

    "/api/config-file": {
      async GET(req) {
        const url = new URL(req.url);
        const path = url.searchParams.get("path");
        
        if (!path) {
          return Response.json({ 
            error: "Path parameter is required" 
          }, { status: 400 });
        }
        
        try {
          const content = await $`bash -c "cat ${path}"`.text();
          return Response.json({ content });
        } catch (error) {
          return Response.json({ 
            error: "Failed to read file",
            message: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
      },
      
      async POST(req) {
        try {
          const { path, content } = await req.json();
          
          if (!path) {
            return Response.json({ 
              error: "Path is required" 
            }, { status: 400 });
          }
          
          await $`bash -c "echo '${content}' > ${path}"`;
          return Response.json({ success: true });
        } catch (error) {
          return Response.json({ 
            error: "Failed to write file",
            message: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
      }
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
