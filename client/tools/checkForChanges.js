import fs from 'fs';
import process from 'process';

function buildIsFresh() {
    if (!fs.existsSync('dist/index.html')) {
        return false;
    }

    const targetFiles = ['dist'];
    const sourceFiles = ['package.json', 'tsconfig.json', 'index.html', 'vite.config.ts', 'src'];

    function scanDirectory(path, list) {
        for (const file of fs.readdirSync(path)) {
            const filePath = `${path}/${file}`;
            const stat = fs.lstatSync(filePath);
            if (stat.isFile()) {
                list.push(filePath);
            } else if (stat.isDirectory()) {
                list.push(filePath);
                scanDirectory(filePath, list);
            }
        }
    }

    function getTimestamp(files, isMin) {
        let ret = 0;

        for (const file of files) {
            const stat = fs.lstatSync(file);
            const mtime = stat.mtimeMs;
            if (!ret || (isMin ? (mtime < ret) : (mtime > ret))) {
                ret = mtime;
            }
        }

        return ret;
    }

    scanDirectory('src', sourceFiles);
    scanDirectory('dist', targetFiles);

    const sourceMaxTime = getTimestamp(sourceFiles, false);
    const targetMinTime = getTimestamp(targetFiles, true);

    return sourceMaxTime < targetMinTime;
}

const isFresh = buildIsFresh();

process.exit(isFresh ? 0 : 1);
