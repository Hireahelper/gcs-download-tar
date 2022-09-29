import * as core from '@actions/core';
import * as github from '@actions/github';
import { Storage, File, Bucket } from '@google-cloud/storage';
import { withFile as withTemporaryFile } from 'tmp-promise';

import { ObjectMetadata } from './gcs-utils';
import { getInputs } from './inputs';
import { extractTar } from './tar-utils';

async function getBestMatch(
  bucket: Bucket,
  bucketPrefix: string,
  key: string,
): Promise<File | null> {
  let folderPrefix = `${github.context.repo.owner}/${github.context.repo.repo}`;

  if (bucketPrefix) {
    folderPrefix += '/' + bucketPrefix.replace(/^\/|\/$/, '');
  }

  const exactFile = bucket.file(`${folderPrefix}/${key}.tar`);
  const [exactFileExists] = await exactFile.exists();

  core.debug(`Exact file name: ${exactFile.name}.`);

  if (exactFileExists) {
    console.log(`🙌 Found exact match from cache for key '${key}'.`);
    return exactFile;
  } else {
    console.log(`🔸 No exact match found for key '${key}'.`);
  }

  return null;
}

async function main() {
  const inputs = getInputs();
  const bucket = new Storage().bucket(inputs.bucket);

  const bestMatch = await core
    .group('🔍 Searching the best cache archive available', () =>
      getBestMatch(bucket, inputs.bucketPrefix, inputs.key),
    )
    .catch((err) => {
      core.setFailed(err);
      throw err;
    });

  if (!bestMatch) {
    core.setOutput('success', 'false');
    console.log('😢 No cache candidate found.');
    return;
  }

  core.debug(`Best match name: ${bestMatch.name}.`);

  const bestMatchMetadata = await bestMatch
    .getMetadata()
    .then(([metadata]) => metadata as ObjectMetadata);

  core.debug(`Best match metadata: ${JSON.stringify(bestMatchMetadata)}.`);

  const compressionMethod =
    bestMatchMetadata?.metadata?.['Cache-Action-Compression-Method'];

  core.debug(`Best match compression method: ${compressionMethod}.`);

  if (!bestMatchMetadata || !compressionMethod) {
    core.setOutput('success', 'false');
    console.log('😢 No cache candidate found (missing metadata).');
    return;
  }

  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  return withTemporaryFile(async (tmpFile) => {
    await core.group('🌐 Downloading cache archive from bucket', async () => {
      console.log(`🔹 Downloading file '${bestMatch.name}'...`);

      return bestMatch.download({
        destination: tmpFile.path,
      });
    });

    await core.group('🗜️ Extracting cache archive', () =>
      extractTar(tmpFile.path, compressionMethod, workspace),
    );

    core.setOutput('success', 'true');
    console.log('✅ Successfully restored cache.');
  });
}

void main();
