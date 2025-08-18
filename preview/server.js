import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import the built module
let snapsave;
try {
  const { snapsave: snapSaveFunction } = await import('../dist/index.mjs');
  snapsave = snapSaveFunction;
} catch (error) {
  console.error('Failed to import snapsave module:', error.message);
  console.log('Please ensure the project is built by running: pnpm build');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Add JSON middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add CORS headers for cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files from the preview directory
app.use(express.static(new URL('.', import.meta.url).pathname));

// API endpoint for testing
app.post('/api/test', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        const result = await snapsave(url);
        res.json(result);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// GET endpoint for direct downloads
app.get('/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL parameter is required' });
        }

        const result = await snapsave(url);
        
        if (result.success && result.data?.media?.[0]?.url) {
            // Redirect to the actual download URL
            res.redirect(result.data.media[0].url);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main route to serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(new URL('./index.html', import.meta.url).pathname);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Preview website running at http://0.0.0.0:${PORT}`);
    console.log('You can now test your SnapSave API through the web interface!');
    console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
