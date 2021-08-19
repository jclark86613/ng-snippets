// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import {Dirent, PathLike, promises as fs} from 'fs';

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
	let data: any[] = await getComponentsData(files);

	// save to ng-project.code-snippets
	await writeDataToFile(uri, data);
};

// PUBLIC
async function getComponentsData(files: PathLike[]): Promise<any[]> {
	const data: any = {};
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

function writeDataToFile(uri:string, data: any) {
	try {
		let file = `${uri}/.vscode/ng-project.code-snippets`;
		fs.writeFile(file, JSON.stringify(data));
		outputChannel.appendLine('Snippets saved');
	} catch(e) {
		outputChannel.appendLine(e);
	}
}

// PRIVATE
function makeSnippet(name:string, file: string) {
	// this function needs refactored for better regex matching and general reliability
	let open = '';
	let selector = '';
	let inputs = [];
	let outputs = [];
	let body = [];
	let close = '';

	let inputString = "@Input()";
	let outputString = "@Output()";

	let lines = file.split(/\r?\n/g);

	for( let line of lines ) {

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

		if (split[0] === inputString) {
			inputs.push(`  [${split[1]}]=\"${split[2] || ''}\"`);
		}

		if (split[0] === outputString) {
			outputs.push(`  (${split[1]})=\"${split[2] || ''}\"`);
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

	let snippet = {
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
