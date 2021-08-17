// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {Dirent, promises as fs, StatsBase} from 'fs';

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

	// fetch all .component.ts files
	output.appendLine('Complete File List:');
	let files = await getFileList();

	// read file and create snipped json
	files.forEach(file => {
		output.appendLine('    ' + file.name);
	});
};

async function getFileList(): Promise<Dirent[]> {
	const workspace = vscode.workspace.workspaceFolders;
	const uri = (workspace && workspace[0].uri.fsPath) || '';
	const files = await recursiveGetTsFiles(uri + '/src');
	return files;
}

async function recursiveGetTsFiles(uri:string): Promise<Dirent[]> {
	//output list
	const fileList: Dirent[] = [];

	// all files in current uri
    const files: Dirent[] = await fs.readdir(
		uri,
		{ withFileTypes: true }
	);

	// find all .component.ts files or read next dir
	for( let file of files ) {
		if (file.isFile() && file.name.slice(-fileSuffix.length) === fileSuffix) {
			fileList.push(file);
		}
		if (file.isDirectory()) {
			fileList.push( ... await recursiveGetTsFiles(uri + '/' + file.name) );
		}
	}

	return fileList;
}
