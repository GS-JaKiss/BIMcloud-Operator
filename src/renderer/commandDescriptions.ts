import type { BCBuildCommand, BCProCommand, BCProFlag } from '../shared/contracts';

export const BC_BUILD_COMMAND_DESCRIPTIONS: Record<BCBuildCommand, string> = {
  'build-portal': 'Builds the Portal package (Portal Server backend + Portal UI frontend).',
  'clean-portal': 'Cleans the Portal package (Portal Server backend + Portal UI frontend).',
  'build-portal-server': 'Builds the Portal Server package (backend).',
  'clean-portal-server': 'Cleans the Portal Server package (backend).',
  'build-portal-ui': 'Builds the Portal Server UI (frontend).',
  'clean-portal-ui': 'Cleans the Portal Server UI (frontend).',
  'build-bimcloud-configurator': 'Builds the BIMcloud Configurator Electron tray app (needed by BCPro service mode).',
  'clean-bimcloud-configurator': 'Cleans the BIMcloud Configurator build output.',
  'build-provisioning-tool': 'Builds the Provisioning Tool (BCPro) package.',
  'clean-provisioning-tool': 'Cleans the Provisioning Tool (BCPro) package.',
  'build-tools': 'Builds the Teamwork Server tools (Configurator, BCPro, Log Analyzer).',
  'clean-tools': 'Cleans the Teamwork Server tools packages.',
  'build-bimcloud-logs-analyzer-tool': 'Builds the BIMcloud Log Analyzer Tool (BLAT).',
  'clean-bimcloud-logs-analyzer-tool': 'Cleans the BIMcloud Log Analyzer Tool (BLAT).',
  'run-tenduke-tests': 'Runs Portal Server tsc, eslint and 10Duke unit tests (UAT).',
  'run-portal-server-tests': 'Runs the Portal Server backend unit tests.',
  'run-portal-server-cluster-tests': 'Runs the Portal Server cluster tests without reinstalling modules.',
  'run-gsid-tests': 'Runs Portal Server tsc, eslint and GSID unit tests.',
  'run-portal-server-ui-tests': 'Runs the Portal Server frontend unit tests.',
  'run-portal-server-ui-ci-sanity-tests': 'Runs the Portal Server frontend CI sanity tests.',
  'run-portal-server-ui-npm-script': 'Runs selected Portal Server frontend npm scripts.',
  'run-jenkins-unittest': 'Runs the BIMcloud test suite.',
  'run-jenkins-buildtest': 'Runs the BIMcloud build test suite.',
  'run-provisioning-tool-tests': 'Runs the BCPro unit tests.',
  'run-native-unit-tests': 'Runs the BIMcloud native unit test suite.',
  'run-all-tests': 'Runs all available tests in one big step.',
  'run-nostromo': 'Runs Nostromo on the local build using the parallel test runner.',
  'run-coverage': 'Runs backend and frontend coverage.',
  'run-portal-server-redis-tests': 'Runs the Portal Server Redis unit tests.',
  'docker-build-local': 'Builds the local Docker image.',
  'docker-build': 'Builds Docker images and creates packages.',
  'docker-incremental-build': 'Builds Docker images without packaging and cleaning.',
  'docker-package-build': 'Cleans, builds Docker images and creates packages.',
  'docker-clean': 'Deletes all BIMcloud related Docker images.',
  'docker-clean-branch': 'Deletes all BIMcloud related Docker images of the current branch.',
  'docker-build-twct': 'Builds the TWCT Docker image.',
  'docker-build-twct-validation': 'Builds the TWCT validation Docker image.',
  'docker-start': 'Builds and starts the local Docker images.',
  'docker-start-extui': 'Builds and starts the local Docker images with the external UI.',
  'docker-run-twct': 'Runs the TWCT Docker image.',
  'docker-stop': 'Stops the local Docker images.',
  'get-gcp-artifacts': 'Downloads a build result archive from Google Cloud.',
  'localize': 'Localizes the Electron tools and the Portal UI (frontend).',
  'localize-portal-ui': 'Localizes the Portal Server UI (frontend).',
  start: 'Starts BIMcloud.',
  stop: 'Stops BIMcloud.',
  restart: 'Restarts BIMcloud.',
  'start-portal': 'Starts the Portal Server.',
  'start-portal-10duke': 'Starts the Portal Server in 10Duke mode.',
  'stop-portal': 'Stops the Portal Server.',
  sbs: 'Shortcut: stops the servers, runs build-portal, then starts the servers again.'
};

export const BC_PRO_COMMAND_DESCRIPTIONS: Record<BCProCommand, string> = {
  up: 'Installs and starts the environment described by the manifest.',
  start: 'Starts an already installed environment.',
  stop: 'Stops the environment.',
  down: 'Stops the environment, removes its services and deletes the installed files. Always needs admin.',
  dup: 'Runs down, then up: reinstalls and restarts the environment.',
  reset: 'Wipes the server data and rewrites the config, then starts the environment unless --stopped is set.',
  clean: 'Cleans every BIMcloud environment installed with this tool. No manifest needed; always needs admin.'
};

export const BC_PRO_FLAG_DESCRIPTIONS: Record<BCProFlag, string> = {
  '--detached': 'Runs the servers as plain console processes instead of Windows services. No admin needed, '
    + 'inherits your environment variables. Required for installTo: none.',
  '--stopped': 'Copies/prepares the files without starting the environment.',
  '--clean': 'Cleans the installed environment if the command fails.',
  '-v': 'Verbose logging.'
};
