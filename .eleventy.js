const markdownIt = require("markdown-it");
const mdTables = require("markdown-it-multimd-table");

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toTitleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPostCategorySlugs(postData) {
  if (!postData) return [];
  if (Array.isArray(postData.categories) && postData.categories.length > 0) {
    return postData.categories.map(toSlug).filter(Boolean);
  }
  if (typeof postData.category === "string" && postData.category.trim()) {
    return [toSlug(postData.category)];
  }
  return [];
}

module.exports = function (eleventyConfig) {
  const md = markdownIt({
    html: true,
    linkify: true,
    breaks: false
  }).use(mdTables);

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addCollection("blogPosts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./_posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("categories", function (collectionApi) {
    const blogPosts = collectionApi
      .getFilteredByGlob("./_posts/*.md")
      .sort((a, b) => b.date - a.date);
    const categoryDocs = collectionApi.getFilteredByGlob("./_categories/*.md");

    const labelsBySlug = new Map();
    for (const doc of categoryDocs) {
      const slug = toSlug(doc.data.slug || doc.fileSlug);
      const title = doc.data.title || toTitleFromSlug(slug);
      if (slug) labelsBySlug.set(slug, title);
    }

    const categoriesMap = new Map();
    for (const post of blogPosts) {
      const slugs = getPostCategorySlugs(post.data);
      for (const slug of slugs) {
        if (!categoriesMap.has(slug)) {
          categoriesMap.set(slug, {
            slug,
            title: labelsBySlug.get(slug) || toTitleFromSlug(slug),
            posts: []
          });
        }
        categoriesMap.get(slug).posts.push(post);
      }
    }

    return Array.from(categoriesMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  });

  eleventyConfig.addFilter("postCategories", function (postData, categoriesCollection) {
    const slugs = getPostCategorySlugs(postData);
    const labelBySlug = new Map(
      (categoriesCollection || []).map((cat) => [cat.slug, cat.title])
    );
    return slugs.map((slug) => ({
      slug,
      title: labelBySlug.get(slug) || toTitleFromSlug(slug)
    }));
  });

  // Date filter for sitemap and schema
  eleventyConfig.addFilter("date", function(dateObj, format) {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    if (format === "%Y-%m-%d") {
      return d.toISOString().split("T")[0];
    }
    if (format === "%Y-%m-%dT%H:%M:%S+00:00") {
      return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
    }
    return d.toISOString();
  });

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("googlebff62dc8eab397a4.html");
  eleventyConfig.addPassthroughCopy("llms.txt");
  eleventyConfig.addPassthroughCopy({ "tools/explain/dist": "tools/explain" });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    templateFormats: ["md", "njk", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
