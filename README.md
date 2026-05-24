# Genesis - Visual Website Builder

A full-stack visual website builder with drag-and-drop interface, responsive design tools, and website publishing capabilities.

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS
- React DnD (drag and drop)

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)

## Features

### Phase 1 - Core Builder
- ✅ Visual canvas with drag-and-drop
- ✅ Element hierarchy navigator
- ✅ Style panel (spacing, typography, colors, flexbox)
- ✅ Responsive breakpoints (desktop/tablet/mobile)
- ✅ HTML/CSS export

### Phase 2 - Backend Integration
- ✅ User authentication
- ✅ Project management (CRUD)
- ✅ Asset management
- ✅ Website publishing
- ✅ Custom subdomain hosting

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas account

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Set up environment variables:

Create `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/genesis-builder
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

3. Start development servers:
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Project Structure

```
genesis-builder/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── store/       # Zustand state
│   │   ├── api/         # API client
│   │   └── utils/       # Utilities
│   └── package.json
├── backend/           # Express backend
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── models/      # MongoDB models
│   │   ├── routes/      # API routes
│   │   └── middleware/  # Auth, upload, etc.
│   └── package.json
└── package.json       # Root scripts
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Assets
- `POST /api/assets/upload` - Upload asset
- `GET /api/assets/:projectId` - List assets
- `DELETE /api/assets/:id` - Delete asset

### Publishing
- `POST /api/publish/:projectId` - Publish site
- `GET /api/publish/:subdomain` - View published site

## Screenshots & Features

### Visual Builder Interface
- **Left Panel:** Element library and page navigator
- **Center Canvas:** Drag-and-drop visual editor with responsive preview
- **Right Panel:** Style controls for selected elements
- **Top Toolbar:** Breakpoint switcher, save, publish, and export tools

### Key Capabilities
- ✅ Drag-and-drop 8 different element types
- ✅ Real-time visual editing
- ✅ Responsive design with 3 breakpoints
- ✅ Complete style customization (layout, typography, colors, spacing)
- ✅ Element tree navigator
- ✅ Undo/Redo system
- ✅ Copy/Paste elements
- ✅ Project persistence to MongoDB
- ✅ HTML/CSS code generation
- ✅ One-click website publishing

## Quick Links

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Detailed Setup](SETUP.md)** - Complete installation and configuration guide

## Development Status

### ✅ Completed Features
- [x] Core builder UI with 3-panel layout
- [x] Drag and drop functionality
- [x] Comprehensive style controls
- [x] Backend API (REST)
- [x] JWT Authentication
- [x] Project persistence
- [x] Asset upload system
- [x] Publishing system with HTML/CSS generation

### 🚧 Future Enhancements
- [ ] Real-time collaboration
- [ ] Template marketplace
- [ ] Custom code injection
- [ ] CMS integration
- [ ] SEO tools
- [ ] Analytics dashboard
- [ ] Custom domains
- [ ] Version history

## License

MIT
