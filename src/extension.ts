// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {Dirent, PathLike, promises as fs, StatsBase} from 'fs';
import { Agent } from 'http';
import path = require('path');

const fileSuffix = '.component.ts';
const output = vscode.window.createOutputChannel("output");

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
	let files: PathLike[] = await getFileList();

	// fetch all .component.ts data
	let data: any[] = await getComponentsData(files);

};


// PUBLIC
async function getComponentsData( files: PathLike[] ): Promise<any[]> {
	const data: any = {};
	for(let file of files) {
		// var setups
		let uri = String(file);
		let ext = path.extname(uri);
		data[path.basename(uri, `.component${ext}`)] = getEmptySnippet();

		// get file data
		// let component = getComponentData(await fs.readFile( file, 'utf8' ));

	}
	output.appendLine(JSON.stringify(data));
	return data;
}

async function getFileList(): Promise<PathLike[]> {
	const workspace = vscode.workspace.workspaceFolders;
	const uri = (workspace && workspace[0].uri.fsPath) || '';
	const files = await recursiveGetTsFiles(uri + '/src/');
	return files;
}

// PRIVATE
function getEmptySnippet() {
	return {
		"prefix": [],
		"body": [],
		"description": '',
		"scope": "javascript,typescript",
	};
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
