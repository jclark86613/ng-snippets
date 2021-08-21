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
	"prefix": string[],
	"body": string[],
	"description": string,
	"scope": string,
}

const outputChannel = vscode.window.createOutputChannel('ngSnippets');
const workspace = vscode.workspace.workspaceFolders;
const uri = (workspace && workspace[0].uri.fsPath) || '';

export async function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		'ng-snippet.CreateNgSnippets',
		createSnippets
	);
	context.subscriptions.push(disposable);
}

export function deactivate() {}

let createSnippets = async (): Promise<void> => {
	outputChannel.appendLine('Creating snippets');

	// fetch .component.ts files list
	let files: PathLike[] = await getFileList(`${uri}/src/`);

	// fetch all .component.ts data
	let data: Snippets = await generateSnippets(files);

	// save to ng-project.code-snippets
	await writeSnippetsToFile(uri, data);
};

// PUBLIC
async function generateSnippets(files: PathLike[]): Promise<Snippets> {
	const data: Snippets = {};
	outputChannel.appendLine('Generating:');
	for(let file of files) {
		let uri = String(file);
		let ext = path.extname(uri);
		let name = path.basename(uri, `.component${ext}`);

		outputChannel.appendLine(`   ${name}`);
		data[name] = makeSnippet(name, await fs.readFile( file, 'utf8' ));
	}
	return data;
}

async function getFileList(uri: string): Promise<PathLike[]> {
	const files = await recursiveGetTsJsFiles(uri);
	return files;
}

function writeSnippetsToFile(uri:string, data: any) {
	try {
		let file = `${uri}/.vscode/ng-project.code-snippets`;
		fs.writeFile(file, JSON.stringify(data));
		outputChannel.appendLine('Snippets saved');
	} catch(e) {
		outputChannel.appendLine(e);
	}
}

// PRIVATE
function makeSnippet(name:string, file: string): Snippet {
	let open: string = '';
	let selector: string = '';
	let inputs: string[] = [];
	let outputs: string[] = [];
	let body: string[] = [];
	let close: string = '';
	let inputString: string = "@Input";
	let outputString: string = "@Output";
	let lines = file.split(/\r?\n/g);

	for( let line of lines ) {

		let inOutRegex = new RegExp( /(@Input|@Output)+\(\)([^;?=]+)/g );
		let inOut = [...line.matchAll(inOutRegex)][0];

		let split = line
			.replace(';', '')
			.replace(':', '')
			.replace('=', '')
			.replace('get', '')
			.replace('set', '')
			.replace(/  +/g, ' ')
			.trim()
			.split(' ');

		if (split[0] === 'selector') {
			selector = split[1].replace(/'/g,'').replace(',', '');
		}

		if (inOut) {
			let [,decortaor, nameType] = inOut;

			// if an @Input is a setter function
			if (nameType.indexOf('set') !== -1) {
				let setNameType = [...nameType.matchAll(new RegExp(/set([^\(]*)\(([^]*)\)/g))][0];
				nameType = `${setNameType[1]}:${setNameType[2].split(':')[1]}`;
			}

			// @Input or @Output name and type
			var [name, type] = nameType.split(':');

			if (decortaor === inputString) {
				// [inputName]="type"
				inputs.push(`  [${name.trim()}]=\"${type?.trim() || ''}\"`);
			}

			if (decortaor === outputString) {
				// (outputName)=""
				outputs.push(`  (${name.trim()})=\"${type?.trim() || ''}\"`);
			}
		}
	}

	body = [...inputs, ...outputs];

	if ( body.length ) {
		open = `<${selector}`;
		body[body.length-1] += '>';
	} else {
		open = `<${selector}>`;
	}
	close = `</${selector}>`;

	const snippet: Snippet = {
		"prefix": [`${selector}`],
		"body": [open, ...body, close],
		"description": `<${name}>`,
		"scope": "html",
	};
	return snippet;
}

async function recursiveGetTsJsFiles(uri:string): Promise<PathLike[]> {
	const comp = '.component';
	const fileList: PathLike[] = [];
    const files: Dirent[] = await fs.readdir(uri,{withFileTypes:true});

	for(let file of files) {
		let ext = path.extname(file.name);
		let basename = path.basename(file.name, ext);

		// find all .component.ts && .component.js files || read next dir
		if (file.isFile() && (ext === '.ts' || ext === '.js') && basename.slice(-comp.length) === comp) {
			fileList.push(`${uri}${file.name}`);
		}

		if (file.isDirectory()) {
			fileList.push(...await recursiveGetTsJsFiles(`${uri}${file.name}/`));
		}
	}

	return fileList;
}
