const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found. Please create a user first.");
    return;
  }

  const blogs = [
    {
      title: "The Science of Botanical Synthesis",
      slug: "science-botanical-synthesis",
      content: "Deep dive into the molecular structure of hemp and how our proprietary synthesis methods preserve the most potent cannabinoids. We utilize advanced chromatography and subcritical CO2 extraction to ensure the highest purity and bioavailability in every drop.",
      excerpt: "An investigation into the advanced extraction methods defining the next generation of hemp science.",
      featuredImage: "https://images.unsplash.com/photo-1544022613-e87ce71c8e4d?auto=format&fit=crop&q=80",
      category: "Science",
      tags: ["extraction", "synthesis", "hemp"],
      status: "PUBLISHED",
      authorId: user.id,
      publishedAt: new Date(),
    },
    {
      title: "Lifestyle Protocols for Optimal Recovery",
      slug: "lifestyle-protocols-recovery",
      content: "Recovery is not just physical; it's a holistic protocol that involves sleep, nutrition, and botanical support. In this guide, we explore how to integrate our latest tinctures into your nightly routine for maximum effect.",
      excerpt: "Defining the daily rituals that maximize the efficacy of your botanical regimen.",
      featuredImage: "https://images.unsplash.com/photo-1512100353917-7027ee1b277c?auto=format&fit=crop&q=80",
      category: "Lifestyle",
      tags: ["recovery", "protocols", "wellness"],
      status: "PUBLISHED",
      authorId: user.id,
      publishedAt: new Date(),
    },
    {
      title: "The Future of Full Spectrum CBD",
      slug: "future-full-spectrum-cbd",
      content: "As regulations evolve, so does our understanding of the entourage effect. We look at the latest research suggesting that the synergy between cannabinoids and terpenes is more complex than previously thought.",
      excerpt: "Exploring the entourage effect and the evolving landscape of full-spectrum cannabinoids.",
      featuredImage: "https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80",
      category: "Research",
      tags: ["cbd", "research", "cannabinoids"],
      status: "PUBLISHED",
      authorId: user.id,
      publishedAt: new Date(),
    }
  ];

  for (const blog of blogs) {
    await prisma.blog.upsert({
      where: { slug: blog.slug },
      update: blog,
      create: blog,
    });
  }

  console.log("Seeded 3 blog posts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
