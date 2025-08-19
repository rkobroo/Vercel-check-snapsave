import express from 'express';
import { snapsave } from '../dist/index.mjs';

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

// Info endpoint - returns media information without download
app.get('/info', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL parameter is required' });
        }

        const result = await snapsave(url);
        res.json(result);
    } catch (error) {
        console.error('Info API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

// Download endpoint - returns direct download link or redirects to media
app.get('/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ success: false, message: 'URL parameter is required' });
        }

        const result = await snapsave(url);
        
        if (!result.success || !result.data?.media?.length) {
            return res.status(404).json({ success: false, message: 'No media found' });
        }

        // Get the first/best quality media
        const media = result.data.media[0];
        
        if (!media.url) {
            return res.status(404).json({ success: false, message: 'No download URL available' });
        }

        // For direct download, redirect to the media URL
        res.redirect(302, media.url);
        
    } catch (error) {
        console.error('Download API Error:', error);
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
