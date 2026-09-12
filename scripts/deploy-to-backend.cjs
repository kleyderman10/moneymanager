/**
 * Copia el contenido de ./dist (Vite build) del frontend a ../moneymanagerapi/public del backend.
 */
const fsp = require('fs/promises');
const path = require('path');

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function rmDirRecursive(dir) {
  if (!(await exists(dir))) return;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await rmDirRecursive(fullPath);
      await fsp.rmdir(fullPath).catch(() => {});
    } else {
      await fsp.unlink(fullPath).catch(() => {});
    }
  }));
}

async function copyRecursive(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = await fsp.readlink(srcPath);
      await fsp.symlink(linkTarget, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }));
}

async function main() {
  const frontendRoot = path.resolve(__dirname, '..');
  const distDir = path.join(frontendRoot, 'dist');

  if (!(await exists(distDir))) {
    console.error('No se encontro la carpeta dist. Ejecuta npm run build primero.');
    process.exit(1);
  }

  const backendPublic = path.resolve(frontendRoot, '..', 'moneymanagerapi', 'public');
  const backendPublicNorm = path.normalize(backendPublic);

  console.log('Origen (frontend dist):', distDir);
  console.log('Destino (backend public):', backendPublicNorm);

  console.log('Limpiando public...');
  await rmDirRecursive(backendPublicNorm);

  await fsp.mkdir(backendPublicNorm, { recursive: true });

  console.log('Copiando archivos...');
  await copyRecursive(distDir, backendPublicNorm);

  console.log('Deploy completado. El frontend esta en el backend/public.');
}

main().catch(err => {
  console.error('Error durante el deploy:', err);
  process.exit(1);
});
