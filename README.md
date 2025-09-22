# WorkoverHub Connect 🚀

> Modern platform for coworking space bookings, professional networking, and community events

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🌟 Overview

WorkoverHub Connect is a comprehensive platform that bridges the gap between professionals and productive workspaces. Whether you're a digital nomad seeking the perfect coworking spot, a community builder organizing events, or a space host looking to maximize your venue's potential, WorkoverHub Connect provides the tools you need.

### Key Features

- **🏢 Space Booking System**: Seamless reservation management for coworking spaces, meeting rooms, and event venues
- **🤝 Professional Networking**: Connect with like-minded professionals through our intelligent suggestion system
- **📅 Event Management**: Create, discover, and participate in community events and professional gatherings
- **💰 Integrated Payments**: Secure payment processing with Stripe Connect for hosts and seamless checkout for users
- **📊 Advanced Analytics**: Comprehensive dashboards for hosts and administrators with revenue insights
- **🔐 Enterprise Security**: GDPR-compliant data handling with robust authentication and authorization

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- **Stripe** account for payment processing

### Installation

```bash
# Clone the repository
git clone https://github.com/workoverhub/workoverhub-connect.git
cd workoverhub-connect

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

1. **Supabase Configuration**: Already configured for project ID `c2ec9501-6094-4703-9d15-50c43aa5d48f`
2. **Database Setup**: Run migrations in Supabase dashboard
3. **Authentication**: Supabase Auth is pre-configured with RLS policies

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run test suite
npm run lint         # ESLint checking
npm run preview      # Preview production build
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query + React Context
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with RLS
- **Payments**: Stripe Connect
- **File Storage**: Supabase Storage with image optimization

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base shadcn/ui components
│   ├── admin/          # Admin dashboard components
│   ├── host/           # Host management interfaces
│   ├── shared/         # Cross-feature components
│   └── layout/         # Layout and navigation
├── hooks/              # Custom React hooks
│   ├── auth/           # Authentication logic
│   ├── queries/        # React Query hooks
│   └── ...
├── lib/                # Utility functions and services
├── pages/              # Route components
├── types/              # TypeScript type definitions
└── integrations/       # External service integrations
    └── supabase/       # Supabase client and types
```

### Key Design Patterns

- **Component Composition**: Modular, reusable components with clear separation of concerns
- **Custom Hooks**: Business logic abstracted into reusable hooks
- **Type Safety**: Comprehensive TypeScript coverage with strict mode enabled
- **Error Boundaries**: Graceful error handling throughout the application
- **Optimistic Updates**: Enhanced UX with React Query optimistic mutations

### UI Patterns

#### Photo Gallery Lightbox
The `SpacePhotoGallery` component implements a 5-tile Airbnb-style gallery with full accessibility support:
- **5-tile Layout**: One large main image + 4 smaller tiles in 2x2 grid
- **Lightbox Modal**: Full-screen photo viewing with keyboard navigation (←/→ arrows, Esc)
- **Touch Support**: Swipe gestures for mobile navigation
- **Accessibility**: Focus trap, screen reader support, ARIA labels
- **Performance**: Image prefetching, lazy loading, optimized aspect ratios

Usage:
```tsx
<SpacePhotoGallery 
  photos={space.photos} 
  spaceTitle={space.title}
  className="mb-6" 
/>
```

## 🚀 Deployment

### Staging Environment

The application is automatically deployable through Lovable's integrated deployment system:

1. **Build Verification**: `npm run build` - Ensures TypeScript compilation
2. **Testing**: `npm run test` - Runs comprehensive test suite
3. **Deploy**: Use Lovable's "Publish" button for instant deployment

### Production Considerations

- **Performance**: Code splitting and lazy loading implemented
- **Security**: GDPR compliance, RLS policies, and secure authentication
- **Monitoring**: Error boundaries and logging for production debugging
- **SEO**: Meta tags, structured data, and social media optimization

### Environment Variables

All sensitive configuration is managed through Supabase secrets:
- Stripe API keys for payment processing
- Mapbox tokens for location services
- Email service credentials

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Quality Standards

- **TypeScript Strict Mode**: Full type safety enforcement
- **ESLint Configuration**: Consistent code style and best practices
- **Testing**: Unit tests for utilities, integration tests for components
- **Documentation**: JSDoc comments for all public APIs

## 📊 Performance & Analytics

- **Bundle Size**: Optimized with Vite and dynamic imports
- **Loading Performance**: Lazy routing and component loading
- **Database Optimization**: Indexed queries and efficient RLS policies
- **Real-time Updates**: Supabase real-time subscriptions for live data

## 🔒 Security & Privacy

- **GDPR Compliance**: Data export, deletion, and consent management
- **Authentication**: Secure JWT-based auth with refresh tokens
- **Authorization**: Row-Level Security policies for data access
- **Data Encryption**: End-to-end encryption for sensitive data

## 📞 Support & Community

- **Documentation**: Comprehensive guides and API documentation
- **Issues**: [GitHub Issues](https://github.com/workoverhub/workoverhub-connect/issues)
- **Community**: Join our [Discord](https://discord.gg/workoverhub) for discussions

## 📝 License

This project is proprietary software. All rights reserved by WorkoverHub Team.

---

**Made with ❤️ by the WorkoverHub Team**

*Empowering professionals to find their perfect workspace and build meaningful connections.*