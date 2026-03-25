# lightPDF - Quickstart Guide

Welcome to **lightPDF**, a blazing-fast, minimalist, and high-performance document viewer built with React, Rust, and Tauri.

## � Inspiration & The Problem

The idea for **lightPDF** was born out of pure frustration with the current state of desktop document viewers. Industry standards like Adobe Acrobat have become notoriously bloated—shipping with heavy background processes, slow startup times, and forced cloud integrations just to read a local file. Even historically lightweight alternatives like SumatraPDF are gradually accumulating feature creep and feeling heavier over time, while their user interfaces have remained visually dated.

I wanted to solve this by building a viewer that opens instantly, looks beautiful, and strictly respects system resources and user privacy.

### Approach & Process Evolution

When working towards the launch, the architecture evolved significantly to meet these goals. Initially, I experimented with pure web technologies and Electron, but that completely defeated the goal of a "lightweight" application. To achieve the blazing-fast requirement, I pivoted the approach:

1. **Framework Shift:** I adopted **Tauri** instead of Electron to drastically reduce the memory footprint and app bundle size.
2. **Rendering Bottleneck:** I quickly realized that JavaScript-based PDF rendering (like PDF.js) wasn't fast enough for massive comic book archives (CBZ/CBR) or graphics-heavy PDFs. 
3. **Native Integration:** To solve this, I overhauled the backend in **Rust**, integrating directly with the native C++ **PDFium** engine. 

This hybrid approach—pushing all the heavy rendering to a hyper-optimized native pipeline while maintaining a fluid, modern **React** frontend—was the breakthrough that allowed lightPDF to deliver extreme performance without sacrificing aesthetics.

## �🚀 Prerequisites

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