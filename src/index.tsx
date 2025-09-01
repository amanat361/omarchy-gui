import { serve, file, $ } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
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
          const expandedPath = path.replace('~', process.env.HOME || '~');
          const file = Bun.file(expandedPath);
          const content = await file.text();
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

    "/api/backup": {
      async GET(req) {
        console.log('Backup GET request received:', req.url);
        const url = new URL(req.url);
        const action = url.searchParams.get("action");
        const filePath = url.searchParams.get("filePath");
        
        if (action === 'list-backups' && filePath) {
          try {
            const expandedFilePath = filePath.replace('~', process.env.HOME || '~');
            const backupDir = `${process.env.HOME}/.config/omarchy-gui/backups`;
            const fileName = filePath.split('/').pop();
            
            // Count timestamped backups
            const backups = await $`bash -c "ls ${backupDir}/${fileName}.* 2>/dev/null | grep -E '\\.[0-9]{4}-' | wc -l || echo '0'"`.text();
            const backupCount = parseInt(backups.trim());
            
            const originalExists = await $`test -f ${backupDir}/${fileName}.original`.nothrow();
            
            return Response.json({ 
              backupCount,
              hasOriginal: originalExists.exitCode === 0
            });
          } catch (error) {
            return Response.json({ 
              error: "Failed to list backups",
              message: error instanceof Error ? error.message : String(error)
            }, { status: 500 });
          }
        }
        
        return Response.json({ 
          error: "Invalid GET request to backup API" 
        }, { status: 400 });
      },
      
      async POST(req) {
        console.log('Backup POST request received:', req.url);
        try {
          const { action, filePath, content } = await req.json();
          console.log('POST body parsed:', { action, filePath, contentLength: content?.length });
          
          if (!action || !filePath) {
            console.log('Missing required fields:', { action: !!action, filePath: !!filePath });
            return Response.json({ 
              error: "Action and filePath are required" 
            }, { status: 400 });
          }

          const expandedFilePath = filePath.replace('~', process.env.HOME || '~');
          const backupDir = `${process.env.HOME}/.config/omarchy-gui/backups`;
          const fileName = filePath.split('/').pop();
          
          console.log('Paths resolved:', { expandedFilePath, backupDir, fileName });
          
          // Ensure backup directory exists
          try {
            await $`mkdir -p ${backupDir}`;
            console.log('Backup directory created/verified');
          } catch (mkdirError) {
            console.error('Failed to create backup directory:', mkdirError);
            return Response.json({ 
              error: "Failed to create backup directory",
              details: mkdirError instanceof Error ? mkdirError.message : String(mkdirError)
            }, { status: 500 });
          }
          
          if (action === 'save') {
            if (!content) {
              console.log('No content provided for save action');
              return Response.json({ 
                error: "Content is required for save action" 
              }, { status: 400 });
            }

            console.log('Starting save operation...');

            // Check if original file exists first
            try {
              const originalFileExists = await $`test -f ${expandedFilePath}`.nothrow();
              console.log('Original file exists:', originalFileExists.exitCode === 0);
              
              if (originalFileExists.exitCode !== 0) {
                console.warn('Original file does not exist:', expandedFilePath);
              }
            } catch (testError) {
              console.error('Error checking original file:', testError);
            }

            // Check if original backup exists, create if not
            try {
              const originalExists = await $`test -f ${backupDir}/${fileName}.original`.nothrow();
              console.log('Original backup exists:', originalExists.exitCode === 0);
              
              if (originalExists.exitCode !== 0) {
                console.log('Creating original backup...');
                await $`cp ${expandedFilePath} ${backupDir}/${fileName}.original`;
                console.log('Original backup created successfully');
              }
            } catch (backupError) {
              console.error('Failed to create original backup:', backupError);
              return Response.json({ 
                error: "Failed to create original backup",
                details: backupError instanceof Error ? backupError.message : String(backupError)
              }, { status: 500 });
            }

            // Create timestamped backup of current file
            try {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              console.log('Creating timestamped backup with timestamp:', timestamp);
              await $`cp ${expandedFilePath} ${backupDir}/${fileName}.${timestamp}`;
              console.log('Timestamped backup created successfully');
            } catch (timestampError) {
              console.error('Failed to create timestamped backup:', timestampError);
              return Response.json({ 
                error: "Failed to create timestamped backup",
                details: timestampError instanceof Error ? timestampError.message : String(timestampError)
              }, { status: 500 });
            }

            // Write new content to actual file using Bun.write
            try {
              console.log('Writing new content to file...');
              console.log('File path permissions check...');
              
              // Check parent directory permissions
              const parentDir = expandedFilePath.substring(0, expandedFilePath.lastIndexOf('/'));
              const dirPerms = await $`ls -ld ${parentDir}`.nothrow();
              console.log('Parent directory permissions:', dirPerms.stdout?.toString());
              
              // Check file permissions if it exists
              const filePerms = await $`ls -l ${expandedFilePath}`.nothrow();
              console.log('File permissions:', filePerms.stdout?.toString());
              
              await Bun.write(expandedFilePath, content);
              console.log('File written successfully');

              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              return Response.json({ 
                success: true, 
                message: "File saved and backed up",
                timestamp 
              });
            } catch (writeError) {
              console.error('Failed to write file:', writeError);
              console.error('Write error details:', {
                name: writeError instanceof Error ? writeError.name : 'Unknown',
                message: writeError instanceof Error ? writeError.message : String(writeError),
                cause: writeError instanceof Error ? writeError.cause : undefined
              });
              
              return Response.json({ 
                error: "Failed to write file",
                details: writeError instanceof Error ? writeError.message : String(writeError),
                filePath: expandedFilePath
              }, { status: 500 });
            }
          }

          if (action === 'revert-original') {
            const originalPath = `${backupDir}/${fileName}.original`;
            const originalExists = await $`test -f ${originalPath}`.nothrow();
            
            if (originalExists.exitCode !== 0) {
              return Response.json({ 
                error: "Original backup not found" 
              }, { status: 404 });
            }

            await $`cp ${originalPath} ${expandedFilePath}`;
            return Response.json({ 
              success: true, 
              message: "Reverted to original file" 
            });
          }

          if (action === 'revert-previous') {
            // Find most recent timestamped backup
            const backups = await $`bash -c "ls -t ${backupDir}/${fileName}.* 2>/dev/null | grep -E '\\.[0-9]{4}-' | head -n 1 || echo ''"`.text();
            const latestBackup = backups.trim();
            
            if (!latestBackup) {
              return Response.json({ 
                error: "No previous backups found" 
              }, { status: 404 });
            }

            await $`cp ${latestBackup} ${expandedFilePath}`;
            const timestamp = latestBackup.split('.').pop();
            
            // Remove the used backup so next revert goes to previous one
            await $`rm ${latestBackup}`;
            
            return Response.json({ 
              success: true, 
              message: "Reverted to previous save",
              timestamp 
            });
          }

          if (action === 'list-backups') {
            // Count timestamped backups
            const backups = await $`bash -c "ls ${backupDir}/${fileName}.* 2>/dev/null | grep -E '\\.[0-9]{4}-' | wc -l || echo '0'"`.text();
            const backupCount = parseInt(backups.trim());
            
            const originalExists = await $`test -f ${backupDir}/${fileName}.original`.nothrow();
            
            return Response.json({ 
              backupCount,
              hasOriginal: originalExists.exitCode === 0
            });
          }

          return Response.json({ 
            error: "Invalid action" 
          }, { status: 400 });
        } catch (error) {
          return Response.json({ 
            error: "Backup operation failed",
            message: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
      }
    },

    "/api/hyprctl": {
      async POST(req) {
        console.log('Hyprctl POST request received:', req.url);
        try {
          const { command } = await req.json();
          console.log('Hyprctl command:', command);
          
          if (!command) {
            return Response.json({ 
              error: "Command is required" 
            }, { status: 400 });
          }

          // Run hyprctl command through bash
          const result = await $`bash -c "hyprctl ${command}"`;
          console.log('Hyprctl command executed successfully:', result.stdout?.toString());

          return Response.json({ 
            success: true,
            output: result.stdout?.toString(),
            message: `hyprctl ${command} executed successfully`
          });
        } catch (error) {
          console.error('Hyprctl command failed:', error);
          return Response.json({ 
            error: "Hyprctl command failed",
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
      }
    },

    "/api/open": {
      async POST(req) {
        console.log('Open POST request received:', req.url);
        try {
          const { path } = await req.json();
          console.log('Opening path:', path);
          
          if (!path) {
            return Response.json({ 
              error: "Path is required" 
            }, { status: 400 });
          }

          const expandedPath = path.replace('~', process.env.HOME || '~');
          
          // Use xdg-open to open file/folder with default application
          await $`bash -c "xdg-open ${expandedPath}"`;
          console.log('Successfully opened:', expandedPath);

          return Response.json({ 
            success: true,
            message: `Opened ${path}`
          });
        } catch (error) {
          console.error('Failed to open path:', error);
          return Response.json({ 
            error: "Failed to open path",
            details: error instanceof Error ? error.message : String(error)
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

    // Serve index.html for all unmatched routes (must be last)
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
