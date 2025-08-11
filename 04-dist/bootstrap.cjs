(async () => {
    // Load the ESM entry regardless of package.json context
    await import('./app.js');
  })();
  