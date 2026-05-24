# Genesis - Setup Guide

## Overview

This is a full-stack visual website builder with a React frontend and Node.js backend.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher
- **MongoDB** (either local installation or MongoDB Atlas account)
- **npm** or **yarn**
- **Git** (optional, for version control)

## Installation Steps

### 1. Install Dependencies

From the project root directory, run:

```bash
npm run install:all
```

This will install dependencies for both the frontend and backend.

Alternatively, install manually:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Set Up MongoDB

#### Option A: Local MongoDB

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB:
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod

   # Windows
   # MongoDB should start automatically as a service
   ```
3. Verify MongoDB is running:
   ```bash
   mongosh
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `backend/.env` with your connection string

### 3. Configure Environment Variables

#### Backend Configuration

The `backend/.env` file should contain:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/genesis-builder
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Important:** Change the `JWT_SECRET` to a strong, unique value for production.

#### Frontend Configuration

The `frontend/.env` file should contain:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Start the Development Servers

From the project root:

```bash
npm run dev
```

This will start both the frontend and backend concurrently.

To start them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## First Time Usage

1. **Register an Account:**
   - Navigate to http://localhost:5173
   - You'll be redirected to the login page
   - Click "Sign up" and create an account

2. **Create a Project:**
   - After logging in, you'll see the dashboard
   - Click "+ New Project"
   - Enter a project name

3. **Build Your Page:**
   - Drag elements from the left panel onto the canvas
   - Click elements to select them
   - Edit styles in the right panel
   - Use the breakpoint controls (desktop/tablet/mobile) to create responsive designs

4. **Save Your Work:**
   - Click "Save" in the toolbar
   - Your project is automatically saved to MongoDB

5. **Publish Your Site:**
   - Click "Publish" in the toolbar
   - Enter a subdomain name
   - Your site will be available at `subdomain.pages.dev`

## Project Structure

```
genesis-builder/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── Canvas/    # Drag-drop canvas
│   │   │   ├── LeftPanel/ # Elements & Navigator
│   │   │   ├── RightPanel/# Style controls
│   │   │   ├── Toolbar/   # Top toolbar
│   │   │   └── Auth/      # Login/Register
│   │   ├── store/         # Zustand state management
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── backend/               # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, upload, etc.
│   │   └── utils/         # HTML/CSS generation
│   └── package.json
│
└── package.json           # Root package.json
```

## Features Implemented

### Core Builder Features
✅ Drag-and-drop elements
✅ Visual canvas
✅ Element hierarchy navigator
✅ Style panel with controls for:
  - Layout (Flexbox, Grid)
  - Spacing (Padding, Margin)
  - Typography
  - Colors & Backgrounds
  - Borders & Effects
✅ Responsive breakpoints (Desktop/Tablet/Mobile)
✅ Undo/Redo functionality
✅ Copy/Paste elements

### Backend Features
✅ User authentication (JWT)
✅ Project management (CRUD)
✅ File upload for assets
✅ Website publishing
✅ HTML/CSS code generation

## Available Elements

- **Container** - Max-width centered container
- **Section** - Full-width section
- **Div Block** - Generic container
- **Heading** - H2 heading text
- **Text** - Paragraph text
- **Button** - Interactive button
- **Image** - Image element
- **Link** - Hyperlink element

## Keyboard Shortcuts

- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Cmd/Ctrl + C` - Copy selected element
- `Cmd/Ctrl + V` - Paste element
- `Delete` - Delete selected element

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
1. Make sure MongoDB is running:
   ```bash
   # Check if MongoDB is running
   ps aux | grep mongod
   ```
2. Verify the connection string in `backend/.env`

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
1. Kill the process using the port:
   ```bash
   # macOS/Linux
   lsof -ti:5000 | xargs kill -9

   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```
2. Or change the port in `backend/.env`

### Frontend Not Connecting to Backend

**Solution:**
1. Check that both servers are running
2. Verify CORS settings in `backend/src/server.ts`
3. Check `frontend/.env` has correct API URL
4. Clear browser cache and reload

### TypeScript Errors

**Solution:**
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

## Building for Production

### Frontend Build

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

### Backend Build

```bash
cd backend
npm run build
npm start
```

The compiled JavaScript will be in `backend/dist/`

### Deployment Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Use production MongoDB database
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production domain
- [ ] Set up proper file upload storage (S3, etc.)
- [ ] Configure CDN for static assets
- [ ] Set up SSL certificates
- [ ] Configure domain name for published sites

## Next Steps

After getting the application running, you can:

1. **Extend Elements:** Add more element types (navbar, footer, forms, etc.)
2. **Add Templates:** Create pre-built templates users can start from
3. **Implement Collaboration:** Add real-time collaboration features
4. **Custom Code:** Allow users to add custom HTML/CSS/JS
5. **CMS Integration:** Connect to a headless CMS
6. **SEO Tools:** Add meta tags and SEO configuration
7. **Analytics:** Track published site analytics
8. **Custom Domains:** Allow users to connect custom domains

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the code comments in the source files
- Open an issue in the project repository

## License

MIT License - feel free to use this project for learning or commercial purposes.
