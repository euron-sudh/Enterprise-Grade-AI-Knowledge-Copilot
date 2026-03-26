'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Zap, Menu, X } from 'lucide-react';

function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-gray-950/60 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">KnowledgeForge</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-b border-white/10 px-4 pb-6 pt-2 space-y-4">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block text-gray-300 hover:text-white text-sm font-medium py-1"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link href="/login" className="text-gray-300 text-sm font-medium py-2">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg text-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MarketingFooter() {
  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'Changelog', href: '/changelog' },
        { label: 'Roadmap', href: '/roadmap' },
        { label: 'Security', href: '/security' },
        { label: 'Status', href: '/status' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press', href: '/contact' },
        { label: 'Partners', href: '/contact' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'API Reference', href: 'http://localhost:8010/docs', external: true },
        { label: 'Tutorials', href: '/docs#tutorials' },
        { label: 'Community', href: 'https://github.com', external: true },
        { label: 'Webinars', href: '/contact' },
        { label: 'Case Studies', href: '/blog' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/privacy#cookies' },
        { label: 'GDPR', href: '/privacy#gdpr' },
        { label: 'HIPAA', href: '/security#hipaa' },
        { label: 'SOC 2', href: '/security#soc2' },
      ],
    },
  ];

  const socials = [
    { label: 'Twitter', href: 'https://twitter.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Discord', href: 'https://discord.com' },
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg">KnowledgeForge</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              The enterprise AI copilot that transforms how teams access and leverage
              organizational knowledge.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={(link as any).external ? '_blank' : undefined}
                      rel={(link as any).external ? 'noopener noreferrer' : undefined}
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} KnowledgeForge, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 antialiased">
      <MarketingNav />
      <main className="pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
