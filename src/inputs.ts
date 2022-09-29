import * as core from '@actions/core';

export interface Inputs {
  bucket: string;
  bucketPrefix: string;
  key: string;
}

export function getInputs(): Inputs {
  const inputs = {
    bucket: core.getInput('bucket', { required: true }),
    bucketPrefix: core.getInput('bucket-prefix', { required: false }),
    key: core.getInput('key', { required: true }),
  };

  core.debug(`Loaded inputs: ${JSON.stringify(inputs)}.`);

  return inputs;
}
