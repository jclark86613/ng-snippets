// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {Dirent, PathLike, promises as fs, StatsBase} from 'fs';
import { Agent } from 'http';
import path = require('path');

const fileSuffix = '.component.ts';
const output = vscode.window.createOutputChannel("output");
const workspace = vscode.workspace.workspaceFolders;
const uri = (workspace && workspace[0].uri.fsPath) || '';

export async function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		'ng-component-template-snippet.scan',
		createSnippets
	);
	context.subscriptions.push(disposable);
}

export function deactivate() {}

let createSnippets = async (): Promise<void> => {

	// fetch .component.ts files list
	let files: PathLike[] = await getFileList(uri + '/src/');

	// fetch all .component.ts data
	let data: any[] = await getComponentsData(files);

	// save to angular-project.code-snippets
	fs.writeFile(uri+'/.vscode/angular-project.code-snippets', JSON.stringify(data));

};


// PUBLIC
async function getComponentsData( files: PathLike[] ): Promise<any[]> {
	const data: any = {};
	for(let file of files) {
		// var setups
		let uri = String(file);
		let ext = path.extname(uri);
		let name = path.basename(uri, `.component${ext}`);
		data[name] = makeSnippet(name, await fs.readFile( file, 'utf8' ));
	}
	output.appendLine(JSON.stringify(data));
	return data;
}

async function getFileList(uri: string): Promise<PathLike[]> {
	const files = await recursiveGetTsFiles(uri);
	return files;
}

// PRIVATE
function makeSnippet(name:string, file: string) {
	let lines = file.split('\n');

	let inputString = "@Input()";
	let outputString = "@Output()";

	let open = `<${name}>`;
	let inputs = [];
	let outputs = [];
	let body = [];
	let close = `</${name}>`;

	for( let line of lines ) {
		line = line
			.replace(';', '')
			.replace(':', '')
			.replace('=', '')
			.trim();
		let split = line.split( ' ' );
		if ( line.substring(0,inputString.length) === inputString ) {
			inputs.push(`  [${split[1]}]=\"${split[2] || ''}\"`);
		}

		if ( line.substring(0,outputString.length) === outputString ) {
			outputs.push(`  (${split[1]})=\"${split[2] || ''}\"`);
		}
	}

	body = [ ...inputs,...outputs ];

	if ( body.length ) {
		open = `<${name}`;
		body[body.length-1] += '>';
	}

	let snippet = {
		"prefix": [name],
		"body": [open, ...body, close],
		"description": name,
		"scope": "javascript,typescript",
	};
	output.appendLine(JSON.stringify(snippet));
	return snippet;
}

async function recursiveGetTsFiles(uri:string): Promise<PathLike[]> {
	//output list
	const fileList: PathLike[] = [];

	// all files in current uri
    const files: Dirent[] = await fs.readdir(
		uri,
		{ withFileTypes: true }
	);

	// find all .component.ts files or read next dir
	for( let file of files ) {

		if (file.isFile() && file.name.slice(-fileSuffix.length) === fileSuffix) {
			fileList.push(uri + file.name);
		}
		if (file.isDirectory()) {
			fileList.push( ... await recursiveGetTsFiles(uri + file.name + '/') );
		}
	}

	return fileList;
}
