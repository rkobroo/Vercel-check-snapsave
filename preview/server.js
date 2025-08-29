import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import snapsave, with fallback for missing dist
let snapsave;
try {
    const snapsaveModule = await import('../dist/index.mjs');
    snapsave = snapsaveModule.snapsave;
} catch (error) {
    console.warn('Warning: Could not import snapsave from dist. Attempting to build...');
    
    // Try to build the project
    try {
        const { execSync } = await import('child_process');
        console.log('Building project...');
        execSync('cd .. && pnpm build', { stdio: 'inherit' });
        console.log('Build completed, trying to import again...');
        
        const snapsaveModule = await import('../dist/index.mjs');
        snapsave = snapsaveModule.snapsave;
        console.log('Successfully imported snapsave after build');
    } catch (buildError) {
        console.error('Build failed:', buildError.message);
        
        // Fallback: try to import from src if available
        try {
            const snapsaveModule = await import('../src/index.js');
            snapsave = snapsaveModule.snapsave;
            console.log('Using source version as fallback');
        } catch (srcError) {
            console.error('Error: Could not import snapsave from either dist or src:', error.message);
            snapsave = null;
        }
    }
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
app.use(express.static(__dirname));

// API endpoint for testing
app.post('/api/test', async (req, res) => {
    try {
        if (!snapsave) {
            return res.status(503).json({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again in a moment.' 
            });
        }

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
        if (!snapsave) {
            return res.status(503).json({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again in a moment.' 
            });
        }

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
        if (!snapsave) {
            return res.status(503).json({ 
                success: false, 
                message: 'Service temporarily unavailable. Please try again in a moment.' 
            });
        }

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
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        snapsaveAvailable: !!snapsave,
        message: snapsave ? 'Service ready' : 'Service building, please try again in a moment'
    });
});

// Status endpoint to check service readiness
app.get('/status', (req, res) => {
    if (snapsave) {
        res.status(200).json({ 
            status: 'ready', 
            message: 'Service is ready to process requests',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({ 
            status: 'building', 
            message: 'Service is still building, please try again in a moment',
            timestamp: new Date().toISOString()
        });
    }
});

// Main route to serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Catch-all route for SPA routing
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Vercel serverless entrypoint
export default (req, res) => {
    return app(req, res);
};
