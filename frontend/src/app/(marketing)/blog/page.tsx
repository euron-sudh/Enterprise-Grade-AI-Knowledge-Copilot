import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const featured = {
  category: 'Product',
  categoryColor: 'bg-indigo-500/20 text-indigo-400',
  date: 'March 20, 2026',
  readTime: '6 min read',
  title: 'Introducing Gemini 2.0 Powered Video Intelligence',
  desc: 'KnowledgeForge now uses Google\'s Gemini 2.0 Flash to understand every frame of your company videos — extracting transcripts, visual descriptions, key topics, and executive summaries in a single multimodal pass.',
  author: { initials: 'SR', name: 'Sofia Reyes', role: 'CTO', gradient: 'from-violet-500 to-purple-600' },
};

const posts = [
  {
    category: 'Engineering',
    categoryColor: 'bg-cyan-500/20 text-cyan-400',
    date: 'March 15, 2026',
    readTime: '8 min read',
    title: 'How We Built JWT Auto-Refresh with Zero Re-Logins',
    desc: 'Deep dive into our NextAuth.js + FastAPI JWT refresh pipeline that keeps enterprise sessions alive for 30 days without interrupting workflows.',
    author: { initials: 'MP', name: 'Maya Patel', role: 'Head of Engineering', gradient: 'from-amber-500 to-orange-600' },
  },
  {
    category: 'Product',
    categoryColor: 'bg-indigo-500/20 text-indigo-400',
    date: 'March 8, 2026',
    readTime: '5 min read',
    title: 'Multi-Model API Keys: One Key, Every AI Provider',
    desc: 'Generate a single KnowledgeForge API key that works across Claude, OpenAI, Gemini, Mistral, and Llama — with per-key permissions and rate limits.',
    author: { initials: 'JC', name: 'James Chen', role: 'Head of Product', gradient: 'from-pink-500 to-rose-600' },
  },
  {
    category: 'Enterprise',
    categoryColor: 'bg-green-500/20 text-green-400',
    date: 'February 28, 2026',
    readTime: '10 min read',
    title: 'RAG vs. Fine-Tuning: What Actually Works for Enterprise Knowledge',
    desc: 'After deploying to 500+ enterprises, here\'s what we\'ve learned about when RAG beats fine-tuning, and when you need both.',
    author: { initials: 'SR', name: 'Sofia Reyes', role: 'CTO', gradient: 'from-violet-500 to-purple-600' },
  },
  {
    category: 'Security',
    categoryColor: 'bg-green-500/20 text-green-400',
    date: 'February 20, 2026',
    readTime: '7 min read',
    title: 'How KnowledgeForge Achieves SOC 2 Type II Compliance',
    desc: 'A transparent look at our security controls, audit process, and the specific technical measures that earned our SOC 2 Type II certification.',
    author: { initials: 'EB', name: 'Emma Brooks', role: 'Head of Design', gradient: 'from-cyan-500 to-blue-600' },
  },
  {
    category: 'Engineering',
    categoryColor: 'bg-cyan-500/20 text-cyan-400',
    date: 'February 10, 2026',
    readTime: '12 min read',
    title: 'Building Hybrid Search: Semantic + BM25 + Reranking',
    desc: 'The architecture behind our sub-200ms enterprise search that combines vector similarity, full-text BM25, and cross-encoder reranking for best-in-class retrieval quality.',
    author: { initials: 'MP', name: 'Maya Patel', role: 'Head of Engineering', gradient: 'from-amber-500 to-orange-600' },
  },
  {
    category: 'Product',
    categoryColor: 'bg-indigo-500/20 text-indigo-400',
    date: 'January 28, 2026',
    readTime: '4 min read',
    title: 'AI Agents for Enterprise: Beyond the Chat Interface',
    desc: 'How our Research Agent, Writing Agent, and Data Analyst are transforming how enterprise teams get deep work done — without leaving their knowledge base.',
    author: { initials: 'JC', name: 'James Chen', role: 'Head of Product', gradient: 'from-pink-500 to-rose-600' },
  },
];

const categories = ['All', 'Product', 'Engineering', 'Enterprise', 'Security', 'Company'];

export default function BlogPage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Header */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Blog</h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Engineering deep dives, product updates, and enterprise AI insights from the KnowledgeForge team.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                i === 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured post */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 mb-8 hover:border-white/10 transition-colors">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${featured.categoryColor}`}>
                  {featured.category}
                </span>
                <span className="text-gray-500 text-sm">{featured.date}</span>
                <span className="text-gray-600 text-sm">·</span>
                <span className="text-gray-500 text-sm">{featured.readTime}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 text-white">{featured.title}</h2>
              <p className="text-gray-400 leading-relaxed mb-6">{featured.desc}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${featured.author.gradient} flex items-center justify-center text-white text-sm font-bold`}>
                    {featured.author.initials}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{featured.author.name}</div>
                    <div className="text-gray-500 text-xs">{featured.author.role}</div>
                  </div>
                </div>
                <a href="#" className="group flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                  Read more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
            <div className="lg:w-72 h-48 lg:h-auto rounded-xl bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
              <div className="text-4xl">🎥</div>
            </div>
          </div>
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.title}
              className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex flex-col hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${post.categoryColor}`}>
                  {post.category}
                </span>
                <span className="text-gray-600 text-xs">·</span>
                <span className="text-gray-500 text-xs">{post.readTime}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2 leading-snug">{post.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4">{post.desc}</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${post.author.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                    {post.author.initials}
                  </div>
                  <div>
                    <div className="text-white text-xs font-semibold">{post.author.name}</div>
                    <div className="text-gray-500 text-xs">{post.date}</div>
                  </div>
                </div>
                <a href="#" className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">Read →</a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="bg-gray-900 border border-white/5 hover:border-white/10 text-gray-300 hover:text-white font-medium px-8 py-3 rounded-xl transition-all text-sm">
            Load more posts
          </button>
        </div>
      </section>
    </div>
  );
}
