Typyst, the modern way to write.  

# Typyst

## Vale Setup

This project uses Vale for writing suggestions. To set up Vale:

1. Run the setup script:
   ```bash
   npm run setup:vale
   ```

This will automatically:
- Download the appropriate Vale binary for your platform
- Place it in the correct directory
- Set the necessary permissions

The Vale configuration and style files are included in the repository.

### Manual Setup (if needed)
If the automatic setup fails, you can manually:
1. Download Vale binaries for your platform from [Vale releases](https://github.com/errata-ai/vale/releases)
2. Place the binaries in the appropriate directory:
   - macOS: `vale/bin/darwin/(arm64|x64)/vale`
   - Windows: `vale/bin/win32/(x64|arm64)/vale.exe`
   - Linux: `vale/bin/linux/(x64|arm64)/vale`  