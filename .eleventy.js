const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  eleventyConfig.setLibrary(
    "md",
    markdownIt({
      html: true,
      linkify: true,
      breaks: false
    })
  );

  eleventyConfig.addCollection("blogPosts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./_posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("about.html");
  eleventyConfig.addPassthroughCopy("services.html");
  eleventyConfig.addPassthroughCopy("results.html");
  eleventyConfig.addPassthroughCopy("contact.html");

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    templateFormats: ["md", "njk"]
  };
};
