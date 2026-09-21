# BIMcloud Operator

An Electron, React, and TypeScript utility for building, running, cleaning, testing, and configuring BIMcloud applications from a development branch. Configuration options and defaults are read from the selected branch's source files and can be applied as overrides to a built BIMcloud Portal Server XML file.

## Architecture

- `src/main` contains the Electron backend: application startup, window management, IPC registration, persistence, file access, and XML mapping services.
- `src/renderer` contains the Vite-powered React frontend: the branch editor hook and focused UI components.
- `src/shared` contains domain models and the typed preload API contract shared by both processes.

The renderer has no direct Node.js access. It communicates with the main process only through the sandboxed preload bridge.

## Run

```powershell
npm.cmd install
npm.cmd start
```

`npm.cmd start` compiles the main process and bundles the React renderer to `dist` before launching Electron. To compile without launching the app, run `npm.cmd run build`.

To create the Windows production installer and portable executable, run `npm.cmd run build-release`. This increments the minor application version before packaging, and artifacts are written to `release`. The existing `dist:win` script remains available as the underlying packaging command without a version increment.

Choose the development branch root, such as `E:\Dev\JaKiss-Matrix-BCMain`. The app expects:

- Source options at `Sources\TWPortalServer\TeamworkPortalServer\js\config\config.json`
- Optional development options at `Sources\TWPortalServer\TeamworkPortalServer\js\config\developmentConfig.json`
- Optional timer options at `Sources\TWPortalServer\TeamworkPortalServer\js\config\timerConfig.json`
- A `PortalServer.config.xml` file below `Bin.Win` after Portal Server has been built

The XML target is selected automatically. Options from all three JSON files are combined, and top-level source config objects map to matching elements below `PortalServer`. For example, the `development` object maps to the lowercase `development` XML element. A checked option is written as an XML override; an unchecked option is omitted so the source default applies. Boolean values use switches, while number and string values use typed inputs.

An unbuilt branch can be opened before `Bin.Win` or `PortalServer.config.xml` exists. The app shows a build-required screen where **Build Portal** invokes the BCBuild `build-portal` command and checks for the generated configuration again when it completes.

For the selected branch, the branch toolbar can run any command exported by `Sources\TWServerTools\BCBuild\bin\bcbuild.cmd`:

- Build and clean: `build-portal`, `clean-portal`, `build-portal-server`, `clean-portal-server`, `build-portal-ui`, `clean-portal-ui`, `build-bimcloud-configurator`, `clean-bimcloud-configurator`, `build-provisioning-tool`, `clean-provisioning-tool`, `build-tools`, `clean-tools`, `build-bimcloud-logs-analyzer-tool`, and `clean-bimcloud-logs-analyzer-tool`.
- Test: `run-tenduke-tests`, `run-portal-server-tests`, `run-portal-server-cluster-tests`, `run-gsid-tests`, `run-portal-server-ui-tests`, `run-portal-server-ui-ci-sanity-tests`, `run-portal-server-ui-npm-script`, `run-jenkins-unittest`, `run-jenkins-buildtest`, `run-provisioning-tool-tests`, `run-native-unit-tests`, `run-all-tests`, `run-nostromo`, `run-coverage`, and `run-portal-server-redis-tests`.
- Docker: `docker-build-local`, `docker-build`, `docker-incremental-build`, `docker-package-build`, `docker-clean`, `docker-clean-branch`, `docker-build-twct`, `docker-build-twct-validation`, `docker-start`, `docker-start-extui`, `docker-run-twct`, and `docker-stop`.
- Artifact and localization: `get-gcp-artifacts`, `localize`, and `localize-portal-ui`.
- Lifecycle: `start`, `stop`, `restart`, `start-portal`, `start-portal-10duke`, `stop-portal`, and `sbs`.

Only one BCBuild command can run at a time. Its stdout and stderr stream into an auto-scrolling output drawer while it runs; the output remains available after completion and can be collapsed, reopened, or cleared.

The branch toolbar also provides a `Delete Bin.Win` action. It requires confirmation before recursively deleting the `Bin.Win` folder directly below the selected development branch.

Saving validates the generated XML, creates a timestamped backup in a `Config Backup` subfolder beside the target, and then updates the selected file. The three newest backups are retained; older backups for that XML are removed automatically. Existing timestamped backups beside the XML are moved into this folder on the next save.

## Validate

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd test
npm.cmd run test:electron
```