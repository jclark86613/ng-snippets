// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {Dirent, PathLike, promises as fs, StatsBase} from 'fs';

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
	output.appendLine('Component List:');
	let files: PathLike[] = await getFileList();

	// fetch all .component.ts data
	output.appendLine('Complete data:');
	let data: any[] = await getComponentsData(files);

	// read file and create snipped json
	files.forEach(file => {
		output.appendLine('    ' + file);
	});
};

async function getComponentsData( files: PathLike[] ): Promise<any[]> {
	const data: any[] = [];
	for(let file of files) {
		// let fileData = await fs.readFile( file, 'utf8' );
		// output.appendLine(fileData);
	}
	return data;
}

// PUBLIC
async function getFileList(): Promise<PathLike[]> {
	output.appendLine('getFileList');
	const workspace = vscode.workspace.workspaceFolders;
	const uri = (workspace && workspace[0].uri.fsPath) || '';
	const files = await recursiveGetTsFiles(uri + '/src/');
	return files;
}

// PRIVATE
async function recursiveGetTsFiles(uri:string): Promise<PathLike[]> {
	output.appendLine('recursiveGetTsFiles');
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
