const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 5001;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files with caching disabled for development
app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// Add a middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Directory for blog posts
const postsDir = path.join(__dirname, '../posts');

// Helper function to render Markdown into HTML
function renderMarkdown(content) {
  return marked(content);
}

// Helper function to convert title to slug
function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Function to get all posts
async function getPosts() {
  try {
    const files = await fs.readdir(postsDir);
    
    const posts = await Promise.all(
      files
        .filter(file => file.endsWith('.md') && file !== 'about.md')
        .map(async (file) => {
          const filePath = path.join(postsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const { data, content: markdown } = matter(content);
          
          const titleFromFilename = file.slice(0, -3);
          
          return {
            slug: titleToSlug(titleFromFilename),
            title: titleFromFilename,
            ...data,
            content: markdown
          };
        })
    );

    return posts;
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
}

// Route handler for individual posts
app.get('/post/:slug', async (req, res) => {
  try {
    const posts = await getPosts();
    const post = posts.find(p => titleToSlug(p.title) === req.params.slug);
    
    if (!post) {
      return res.status(404).render('404');
    }
    
    res.render('post', { post, marked });
  } catch (error) {
    console.error('Error in post route:', error);
    res.status(500).send('Server Error');
  }
});

// Route handler for home page
app.get('/', async (req, res) => {
  try {
    const posts = await getPosts();
    res.render('index', { posts });
  } catch (error) {
    console.error('Error in home route:', error);
    res.status(500).send('Server Error');
  }
});

// About route: Render the about page
app.get('/about', async (req, res) => {
  try {
    const aboutFilePath = path.join(postsDir, 'about.md');
    const content = await fs.readFile(aboutFilePath, 'utf8');
    const htmlContent = marked(content);
    
    res.render('about', { htmlContent });
  } catch (error) {
    console.error('Error in about route:', error);
    if (error.code === 'ENOENT') {
      return res.status(404).render('404');
    }
    res.status(500).send('Server Error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Server Error');
});

// Start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;