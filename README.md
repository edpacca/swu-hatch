# SWU-Hatch (Sonic Waveform Utility Hatch)
[_słuchać_](https://en.wiktionary.org/wiki/s%C5%82ucha%C4%87): To Hear (Old Polish)

_open the hatch and listen carefully_

A mini project designed to help learning C++ and WASM.
The idea is to be able to load and play back audio via the browser, with tools to scrub, pause, play, reverse, change speed etc.

---

## Prerequisites

### 1. Install Emscripten (C++ to WASM compiler)

Follow the official [Emscripten installation guide](https://emscripten.org/docs/getting_started/downloads.html):

```bash
# Clone the emsdk repository
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Install and activate the latest SDK
./emsdk install latest
./emsdk activate latest

# Add Emscripten to your PATH (run this in each new terminal, or add to your shell profile)
source ./emsdk_env.sh  # Linux/macOS
# OR
emsdk_env.bat          # Windows
```

Verify installation:
```bash
emcc --version
```

### 2. Install Node.js

Download and install from [nodejs.org](https://nodejs.org/) (LTS version recommended), or use a package manager:

```bash
# Windows (via Chocolatey)
choco install nodejs

# macOS (via Homebrew)
brew install node

# Linux (via nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install --lts
```

Verify installation:
```bash
node --version
npm --version
```

### 3. Install Make

- **Windows**: Install via [Chocolatey](https://chocolatey.org/) or use [Make for Windows](http://gnuwin32.sourceforge.net/packages/make.htm)
  ```bash
  choco install make
  ```
- **macOS**: Included with Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- **Linux**: Typically pre-installed; if not:
  ```bash
  sudo apt install build-essential  # Debian/Ubuntu
  sudo yum groupinstall "Development Tools"  # CentOS/RHEL
  ```

---

## Setup

### 1. Clone this repository

```bash
git clone https://github.com/yourusername/swuhatch.git
cd swuhatch
```

### 2. Clone `dr_libs` (audio decoding library)

The project uses [dr_wav](https://github.com/mackron/dr_libs) for WAV decoding. Clone it into the project root:

```bash
git clone https://github.com/mackron/dr_libs.git
```

Your directory structure should look like:
```
swuhatch/
├── dr_libs/
│   └── dr_wav.h
├── src/
├── wasm-build/
├── Makefile
└── package.json
```

### 3. Install Node dependencies

```bash
npm install
```

---

## Build & Run

### 1. Build the WASM module

```bash
make
```

This compiles `audio.cpp` to `wasm-build/main.js` and `wasm-build/main.wasm` using Emscripten.

### 2. Start the development server

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`) to access the application.

---

## Development Workflow

- **Modify C++ code**: Edit `audio.cpp`, then run `make` to rebuild
- **Modify JS/HTML**: Changes hot-reload automatically via Vite
- **Clean build artifacts**: `make clean` removes `wasm-build/`

---

## Troubleshooting

- **`emcc: command not found`**: Make sure you've run `source ./emsdk_env.sh` (or `emsdk_env.bat` on Windows) in your current terminal session
- **`dr_wav.h: No such file or directory`**: Ensure `dr_libs/` is cloned into the project root
- **Vite import errors**: Run `make` to generate the WASM files before starting the dev server
