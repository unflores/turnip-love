/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path'
import { workspace, ExtensionContext } from 'vscode'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from 'vscode-languageclient'

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js'),
	)
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions,
		},
	}

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for ruby cucumber documents
		documentSelector: [
			{ scheme: 'file', language: 'plaintext' },
			{ scheme: 'file', language: 'feature' },
			{ scheme: 'file', language: 'ruby' },
		],
		synchronize: {
			configurationSection: 'turnip',
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
		},
	}

	// Create the language client and start the client.
	let disposable = new LanguageClient(
		'turnip',
		'Language Server Turnip',
		serverOptions,
		clientOptions,
	).start()
	context.subscriptions.push(disposable);
}
