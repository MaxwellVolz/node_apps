// core/native-imports.js
export async function importOpenCV() {
    if (process.versions?.sea) {
      const { pathToFileURL } = await import('node:url');
      const path = (await import('node:path')).default;
      const baseDir = path.dirname(process.execPath);
      const url = pathToFileURL(path.join(baseDir, 'native', 'opencv', 'index.cjs')).href;
      const mod = await import(url);
      return mod.default || mod;
    }
    const mod = await import('@u4/opencv4nodejs');
    return mod.default || mod;
  }
  