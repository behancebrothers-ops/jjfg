# LUXE — Premium E-commerce Storefront

[![Built with Lovable](https://img.shields.io/badge/built%20with-lovable-ff69b4)](https://lovable.dev)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

LUXE is a modern, high-performance e-commerce platform built with React, TypeScript, and Tailwind CSS. Featuring a beautiful storefront, powerful admin dashboard, and seamless backend integration.

## ✨ Features

### Storefront
- **Product Catalog** — Browse products with advanced filtering, search, and sorting
- **Smart Virtualization** — Automatic virtual scrolling for 50+ products
- **Wishlist & Favorites** — Save items for later
- **Shopping Cart** — Persistent cart with guest and authenticated support
- **Checkout** — Secure checkout with Stripe integration
- **Order Tracking** — Real-time order status updates
- **User Profiles** — Account management and order history
- **Reviews & Ratings** — Customer product reviews

### Admin Dashboard
- **Product Management** — CRUD operations with image uploads
- **Order Management** — View, update, and track orders
- **Customer Management** — View customer data and order history
- **Discount Codes** — Create and manage promotional codes
- **Analytics** — Sales and traffic insights
- **Email Templates** — Customizable transactional emails
- **Job Postings** — Career page management

### Performance Optimizations
- **Image Preloading** — Priority-based image loading
- **Memoized Components** — Optimized re-renders
- **Virtual Scrolling** — Efficient rendering for large lists
- **React Query Caching** — Smart data fetching with stale-while-revalidate
- **Lazy Loading** — Code splitting and lazy component loading

### Security
- **Row Level Security** — Database-level access control
- **Two-Factor Authentication** — Email-based 2FA
- **Rate Limiting** — Protection against brute force attacks
- **Secure Storage** — Protected file uploads with admin-only access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd luxe-store

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) to view the app.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/UI primitives
│   └── admin/          # Admin-specific components
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── lib/                # Utilities and helpers
├── types/              # TypeScript type definitions
└── integrations/       # External service integrations

supabase/
├── functions/          # Edge functions (serverless)
└── migrations/         # Database migrations
```

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | Shadcn/UI + Radix |
| State Management | TanStack Query |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Backend | Lovable Cloud (Supabase) |
| Payments | Stripe |
| Email | Resend |

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🔐 Environment Variables

Create a `.env` file in the project root:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase Project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon/Public Key | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Project Reference ID | ✅ |

> **Note**: Backend secrets (Stripe, Resend) are configured via `npx supabase secrets set`.

## 🚀 Deployment

For complete deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Quick Overview:
1. **Database**: Create a Supabase project, push schema with `npx supabase db push`
2. **Backend**: Deploy Edge Functions with `npx supabase functions deploy`
3. **Frontend**: Deploy to Vercel, connect your GitHub repo

Additional secrets (Stripe, Resend, etc.) are securely stored in Supabase.

## 🎨 Design System

LUXE uses a custom design system with:

- **Semantic color tokens** — Consistent theming via CSS variables
- **Typography scale** — Responsive font sizing
- **Spacing system** — Consistent margins and padding
- **Component variants** — Reusable button, card, and input styles

Colors are defined in `src/index.css` and `tailwind.config.ts`.

## 📱 Responsive Design

- **Mobile-first** — Optimized for touch devices
- **Breakpoints** — sm (640px), md (768px), lg (1024px), xl (1280px)
- **Adaptive UI** — Components adjust based on viewport

## 🔒 Security Best Practices

1. **Never expose API keys** in client code
2. **Use Row Level Security** for all user data
3. **Validate inputs** on both client and server
4. **Rate limit** authentication endpoints
5. **Sanitize** user-generated content

## 📈 Performance Tips

- Enable virtualization for large product lists (automatic for 50+)
- Use `priority` prop for above-the-fold images
- Leverage React Query's caching
- Minimize bundle size with dynamic imports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using [Lovable](https://lovable.dev) by [Umer Memon](https://github.com/umermemon1)
