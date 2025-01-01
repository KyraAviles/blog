const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const ejs = require('ejs');

async function build() {
  // Create dist directory
  await fs.mkdir('dist', { recursive: true });
  await fs.mkdir('dist/post', { recursive: true });

  // Copy static files
  await fs.cp('public', 'dist', { recursive: true });

  // Read all posts
  const postsDir = path.join(__dirname, 'posts');
  const files = await fs.readdir(postsDir);
  
  const posts = await Promise.all(
    files
      .filter(file => file.endsWith('.md') && file !== 'about.md')
      .map(async (file) => {
        const content = await fs.readFile(path.join(postsDir, file), 'utf8');
        const { data, content: markdown } = matter(content);
        const titleFromFilename = file.slice(0, -3);
        const slug = titleFromFilename
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
        
        return {
          slug,
          title: titleFromFilename,
          ...data,
          content: markdown
        };
      })
  );

  // Read templates
  const indexTemplate = await fs.readFile('views/index.ejs', 'utf8');
  const postTemplate = await fs.readFile('views/post.ejs', 'utf8');
  const aboutTemplate = await fs.readFile('views/about.ejs', 'utf8');

  // Build index page
  const indexHtml = ejs.render(indexTemplate, { posts });
  await fs.writeFile('dist/index.html', indexHtml);

  // Build individual post pages
  for (const post of posts) {
    const postHtml = ejs.render(postTemplate, { 
      post: { ...post, content: marked(post.content) },
      marked 
    });
    await fs.mkdir(`dist/post/${post.slug}`, { recursive: true });
    await fs.writeFile(`dist/post/${post.slug}/index.html`, postHtml);
  }

  // Build about page
  const aboutContent = await fs.readFile('posts/about.md', 'utf8');
  const aboutHtml = ejs.render(aboutTemplate, { 
    htmlContent: marked(aboutContent) 
  });
  await fs.mkdir('dist/about', { recursive: true });
  await fs.writeFile('dist/about/index.html', aboutHtml);
}

build().catch(console.error); 