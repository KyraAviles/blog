const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const app = express();
const PORT = 5000;

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Directory for blog posts
const postsDir = path.join(__dirname, 'posts');

// Helper function to render Markdown into HTML
function renderMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return marked(content);
}

// Helper function to convert title to slug
function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/[^\w\-]+/g, '') // Remove non-word chars (except dashes)
    .replace(/\-\-+/g, '-')   // Replace multiple dashes with single dash
    .replace(/^-+/, '')       // Trim dashes from start
    .replace(/-+$/, '');      // Trim dashes from end
}

// Function to get all posts
async function getPosts() {
  const postsDirectory = path.join(__dirname, 'posts');
  const files = await fs.readdir(postsDirectory);
  
  const posts = await Promise.all(
    files
      .filter(file => file.endsWith('.md') && file !== 'about.md')
      .map(async (file) => {
        const filePath = path.join(postsDirectory, file);
        const content = await fs.readFile(filePath, 'utf8');
        const { data, content: markdown } = matter(content);
        
        // Get the filename without .md extension
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
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
});

// Route handler for home page
app.get('/', async (req, res) => {
  try {
    const posts = await getPosts();
    res.render('index', { posts });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
});

// About route: Render the about page
app.get('/about', async (req, res) => {
  try {
    const aboutFilePath = path.join(postsDir, 'about.md');

    // Use fs.access to check if file exists
    try {
      await fs.access(aboutFilePath);
    } catch {
      return res.status(404).send('<h1>About page not found</h1>');
    }

    const content = await fs.readFile(aboutFilePath, 'utf8');
    const htmlContent = marked(content);
    
    res.render('about', { htmlContent });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});