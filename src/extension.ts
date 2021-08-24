/* eslint-disable require-jsdoc */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import {Dirent, PathLike, promises as fs} from 'fs';
// Interfaces
interface Snippets {
    [key: string]: Snippet;
}
interface Snippet {
    'prefix': string[],
    'body': string[],
    'description': string,
    'scope': string,
}

const outputChannel = vscode.window.createOutputChannel('ngSnippets');
const workspace = vscode.workspace.workspaceFolders;
const uri = (workspace && workspace[0].uri.fsPath) || '';

export async function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
      'ng-snippet.CreateNgSnippets',
      createSnippets
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}

const createSnippets = async (): Promise<void> => {
  outputChannel.appendLine('Creating snippets');

  // fetch .component.ts files list
  const files: PathLike[] = await getFileList(`${uri}/src/`);

  // get the project package.json
  outputChannel.appendLine(`${vscode.workspace.workspaceFolders}/package.json`);
  const project = await fs.readFile(
      `${uri}/package.json`, 'utf8'
  );
  outputChannel.appendLine(project);
  // fetch all .component.ts data
  const data: Snippets = await generateSnippets(
      files,
      JSON.parse(project).name
  );

  // save to ng-project.code-snippets
  await writeSnippetsToFile(uri, data);
};

// PUBLIC
async function generateSnippets(
    files: PathLike[],
    project: string
): Promise<Snippets> {
  const data: Snippets = {};
  outputChannel.appendLine('Generating:');
  for (const file of files) {
    const uri = String(file);
    const ext = path.extname(uri);
    const name = path.basename(uri, `.component${ext}`);
    const snippet: Snippet|false = makeSnippet(
        name,
        await fs.readFile( file, 'utf8' ),
        project
    );
    if (!snippet) {
      continue;
    }
    outputChannel.appendLine(`   ${name}`);
    data[name] = snippet;
  }
  return data;
}

async function getFileList(uri: string): Promise<PathLike[]> {
  const files = await recursiveGetTsJsFiles(uri);
  return files;
}

async function writeSnippetsToFile(uri:string, data: any) {
  try {
    const file = `${uri}/.vscode/ng-project.code-snippets`;
    await fs.mkdir(`${uri}/.vscode/`, {recursive: true} );
    await fs.writeFile(file, JSON.stringify(data));
    outputChannel.appendLine('Snippets saved');
  } catch (e) {
    outputChannel.appendLine(e);
  }
}

// PRIVATE
function makeSnippet(
    name:string,
    file: string,
    project: string
): Snippet|false {
  const inputs: string[] = [];
  const outputs: string[] = [];
  const inputString: string = '@Input';
  const outputString: string = '@Output';
  const lines = file.split(/\r?\n/g);
  let open: string = '';
  let selector: string = '';
  let body: string[] = [];
  let close: string = '';

  for ( const line of lines ) {
    const inOutRegex = new RegExp(
        /(@Input|@Output)\(\)(?:\spublic\s|\sprivate\s|\s)([^;=]+)/g
    );
    const inOut = [...line.matchAll(inOutRegex)][0];

    const split = line
        .replace(';', '')
        .replace(':', '')
        .replace('=', '')
        .replace(/  +/g, ' ')
        .trim()
        .split(' ');

    if (split[0] === 'selector') {
      selector = split[1].replace(/'/g, '').replace(',', '');
    }

    if (inOut) {
      const [, decortaor, nameType] = inOut;

      // if an @Input is a setter function
      // if (nameType.indexOf(' set ') !== -1) {
      //   const setNameType = [
      //     ...nameType.matchAll(new RegExp(/set([^(]*)\(([^]*)\)/g)),
      //   ][0];
      //   nameType = `${setNameType[1]}:${setNameType[2].split(':')[1]}`;
      // }

      // @Input or @Output name and type
      const [name, type] = nameType.split(/:(.+)/);

      if (decortaor === inputString) {
        // [inputName]="type"
        inputs.push(`  [${name.trim()}]="${type?.trim() || ''}"`);
      }

      if (decortaor === outputString) {
        // (outputName)=""
        outputs.push(`  (${name.trim()})=""`);
      }
    }
  }

  if (!selector) {
    return false;
  }

  body = [...inputs.sort(), ...outputs.sort()];

  if ( body.length ) {
    open = `<${selector}`;
    body[body.length-1] += '>';
  } else {
    open = `<${selector}>`;
  }
  close = `</${selector}>`;

  const snippet: Snippet = {
    'prefix': [
      `${selector}`,
      `<${selector}`,
      project,
    ],
    'body': [open, ...body, close],
    'description': `<${name}>`,
    'scope': 'html',
  };
  return snippet;
}

async function recursiveGetTsJsFiles(uri:string): Promise<PathLike[]> {
  const comp = '.component';
  const fileList: PathLike[] = [];
  const files: Dirent[] = await fs.readdir(uri, {withFileTypes: true});

  for (const file of files) {
    const ext = path.extname(file.name);
    const basename = path.basename(file.name, ext);

    // find all .component.ts && .component.js files || read next dir
    if (
      file.isFile() &&
      (ext === '.ts' || ext === '.js') &&
      basename.slice(-comp.length) === comp
    ) {
      fileList.push(`${uri}${file.name}`);
    }

    if (file.isDirectory()) {
      fileList.push(...await recursiveGetTsJsFiles(`${uri}${file.name}/`));
    }
  }

  return fileList;
}
