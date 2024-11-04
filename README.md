# `setup-aws-cli` action

The `isometry/setup-aws-cli` action is installs the AWS CLI v2 on a GitHub Actions Private Runner, exploiting the Tool Cache whenever possible.

## Features

* Fully exploits GitHub Runners' Tool Cache mechanism
* Automatic version resolution

## Inputs

### `version` input

**Optional** Version of aws-cli v2 to install (default: `latest`; example: `v2.19.1`)

## Outputs

### `version` output

The version of aws-cli v2 actually installed.

## Example usage

```yaml
name: example

on:
  workflow_dispatch: {}

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: isometry/setup-aws-cli@v1

      - run: |
          aws --version
```
