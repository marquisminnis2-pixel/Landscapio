# Quick Start Guide

Get Genesis up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm run install:all
```

This installs all dependencies for both frontend and backend.

## Step 2: Start MongoDB

### macOS (Homebrew)
```bash
brew services start mongodb-community
```

### Linux
```bash
sudo systemctl start mongod
```

### Windows
MongoDB should start automatically. If not:
```bash
net start MongoDB
```

### Using MongoDB Atlas (Cloud)
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `backend/.env`:
   ```
   MONGODB_URI=your-connection-string-here
   ```

## Step 3: Start the Application

```bash
npm run dev
```

This starts both frontend and backend servers.

## Step 4: Open the App

Navigate to: **http://localhost:5173**

## Step 5: Create Your First Project

1. Click "Sign up" to create an account
2. Enter your name, email, and password
3. Click "+ New Project" on the dashboard
4. Start building your website!

## Basic Usage

### Adding Elements
- Drag elements from the left panel onto the canvas
- Elements: Container, Section, Div, Heading, Text, Button, Image, Link

### Styling Elements
1. Click on any element to select it
2. Use the right panel to modify styles:
   - **Layout:** Display type, Flexbox settings
   - **Size:** Width, height, min/max dimensions
   - **Spacing:** Padding and margins
   - **Typography:** Font size, weight, color
   - **Background:** Colors and images
   - **Border:** Width, color, radius

### Responsive Design
- Use the breakpoint buttons (Desktop/Tablet/Mobile) in the toolbar
- Set different styles for each breakpoint
- Styles cascade: Desktop → Tablet → Mobile

### Navigator Panel
- Switch to "Navigator" tab in the left panel
- See your page structure as a tree
- Click elements to select them
- Delete elements with the trash icon

### Keyboard Shortcuts
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Delete` - Delete selected element

## Troubleshooting

### Can't connect to MongoDB?
Make sure MongoDB is running. Check with:
```bash
mongosh
```

### Port 5000 already in use?
Kill the process:
```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Frontend not loading?
1. Make sure both servers are running
2. Check http://localhost:5000/api/health returns `{"status":"ok"}`
3. Clear browser cache

## What's Next?

Once you're comfortable with the basics:

1. **Publish a Site:** Click "Publish" and enter a subdomain
2. **Save Projects:** Click "Save" to persist changes
3. **Explore Templates:** Build common layouts (hero, pricing, etc.)
4. **Export Code:** Click "Export Code" to download HTML/CSS

## Need Help?

Check [SETUP.md](SETUP.md) for detailed documentation and troubleshooting.

---

Happy building! 🚀
