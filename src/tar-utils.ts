/* eslint-disable sonarjs/no-duplicate-string */

import * as exec from '@actions/exec';

export enum CompressionMethod {
  GZIP = 'gzip',
  ZSTD_WITHOUT_LONG = 'zstd (without long)',
  ZSTD = 'zstd',
}

export async function extractTar(
  archivePath: string,
  compressionMethod: CompressionMethod,
  cwd: string,
): Promise<void> {
  console.log(
    `🔹 Detected '${compressionMethod}' compression method from object metadata.`,
  );

  const compressionArgs =
    compressionMethod === CompressionMethod.GZIP
      ? ['-z']
      : compressionMethod === CompressionMethod.ZSTD_WITHOUT_LONG
      ? ['--use-compress-program', 'zstd -d --long=30']
      : ['--use-compress-program', 'zstd -d'];

  await exec.exec('tar', [
    '-x',
    ...compressionArgs,
    '-P',
    '-f',
    archivePath,
    '-C',
    cwd,
  ]);
}
