# lightPDF - Quickstart Guide

Welcome to **lightPDF**, a blazing-fast, minimalist, and high-performance document viewer built with React, Rust, and Tauri.

## 🚀 Prerequisites

Before you begin, ensure your development environment has the following installed:
- **Node.js** (v18 or higher)
- **Rust & Cargo** (latest stable release)
- **C++ Build Tools** (Required by Tauri on Windows)

## 🛠️ Setup Instructions

1. **Install Node Dependencies**
   Run the following command in the project root to install all required frontend and Tauri CLI packages:
   ```bash
   npm install
   ```

2. **Download the PDFium Engine (CRITICAL)**
   Because `lightPDF` leverages a native C++ engine for extreme performance, you must provide the compiled binary locally:
   - Go to the bblanchon/pdfium-binaries Releases.
   - Download the latest `pdfium-win-x64.tgz` (Ensure the build number is `6363` or newer).
   - Extract the `.tgz` archive and copy the `pdfium.dll` file located inside the `bin/` folder.
   - Paste `pdfium.dll` directly into the `src-tauri/` directory of this project.

## 💻 Development

To start the local development server with hot-module replacement (HMR) for both the React frontend and Rust backend:
```bash
npm run tauri dev
```

## 📦 Production Build

To compile the application into heavily optimized standalone executables and an installable setup wizard:
```bash
npm run tauri build
```

*Note: If distributing the raw standalone executable (`lightpdf.exe`) without the installer, ensure that a copy of `pdfium.dll` is placed in the exact same directory as the executable so it can be loaded at runtime.*