/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	IPCMessageReader,
	IPCMessageWriter,
	IConnection,
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams
} from 'vscode-languageserver'

import * as globby from 'globby'
import { watchFile, readFileSync } from 'fs'
import * as path from 'path'

import StepsHandler from './stepsHandler'

interface Settings {
	turnip: {
		steps: string[]
		syncfeatures: boolean | string
	}
}

const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

const stepsHandler = new StepsHandler()
let settings: Settings
// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments()
documents.listen(connection)

//Path to the root of our workspace
let workspaceRoot: string

connection.onInitialize((params: InitializeParams) => {
	connection.console.log("hai austin")
	workspaceRoot = params.rootPath

	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	}
})

connection.onInitialized(() => {

	// Register for all configuration changes.
	connection.client.register(
		DidChangeConfigurationNotification.type,
		undefined
	)

	connection.workspace.onDidChangeWorkspaceFolders(_event => {
		connection.console.log('Workspace folder change event received.')
	})

})

connection.onDidChangeConfiguration(async change => {
	settings = <Settings>change.settings
	// if (!Array.isArray(settings.turnip.steps))
	// throw new Error('steps setting must be an array!')
	// watchFiles(settings.turnip.steps)
	await watchFiles(['spec/acceptance/steps/'])

})


async function watchFiles(stepPaths: string[]): Promise<void> {
	stepPaths = stepPaths.map((filePath) => path.join(workspaceRoot, filePath))

	const filePaths = await globby(stepPaths)
	connection.console.log(filePaths.join(','))
	filePaths.forEach((filePath) => {
		stepsHandler.populate(filePath)
		watchFile(filePath, () => {
			stepsHandler.populate(filePath)
		})
	})
}

// TODO: questionable if this is the best place to do this
// I am looking to ensure that the steps are parsed when booting up
documents.onDidOpen(async () => {
	// const stepPaths = settings.turnip.steps.map((filePath) =>
	// 	path.join(workspaceRoot, filePath),
	// )
	// const stepPaths = path.join(workspaceRoot, 'spec/acceptance/steps/*')
	// const filePaths = await globby(stepPaths)
	// filePaths.forEach((filePath) => {
	// 	stepsHandler.parseSteps(readFileSync(filePath, 'utf8'))
	// })
})

interface ExampleSettings {
	maxNumberOfProblems: number
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 }
let globalSettings: ExampleSettings = defaultSettings

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map()

// connection.onDidChangeConfiguration(change => {
// 	if (hasConfigurationCapability) {
// 		// Reset all cached document settings
// 		documentSettings.clear()
// 	} else {
// 		globalSettings = <ExampleSettings>(
// 			(change.settings.languageServerExample || defaultSettings)
// 		)
// 	}

// 	// Revalidate all open text documents
// 	documents.all().forEach(validateTextDocument)
// })

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
// 	if (!hasConfigurationCapability) {
// 		return Promise.resolve(globalSettings)
// 	}
// 	let result = documentSettings.get(resource)
// 	if (!result) {
// 		result = connection.workspace.getConfiguration({
// 			scopeUri: resource,
// 			section: 'languageServerExample'
// 		})
// 		documentSettings.set(resource, result)
// 	}
// 	return result
// }

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri)
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
// documents.onDidChangeContent(async change => {
// 	validateTextDocument(change.document)
// })

// async function validateTextDocument(textDocument: TextDocument): Promise<void> {
// 	// In this simple example we get the settings for every validate run.
// 	let settings = await getDocumentSettings(textDocument.uri)

// 	// The validator creates diagnostics for all uppercase words length 2 and more
// 	let text = textDocument.getText()
// 	let pattern = /\b[A-Z]{2,}\b/g
// 	let m: RegExpExecArray | null

// 	let problems = 0
// 	let diagnostics: Diagnostic[] = []
// 	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
// 		problems++
// 		let diagnostic: Diagnostic = {
// 			severity: DiagnosticSeverity.Warning,
// 			range: {
// 				start: textDocument.positionAt(m.index),
// 				end: textDocument.positionAt(m.index + m[0].length)
// 			},
// 			message: `${m[0]} is all uppercase.`,
// 			source: 'ex'
// 		}
// 		if (hasDiagnosticRelatedInformationCapability) {
// 			diagnostic.relatedInformation = [
// 				{
// 					location: {
// 						uri: textDocument.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: 'Spelling matters'
// 				},
// 				{
// 					location: {
// 						uri: textDocument.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: 'Particularly for names'
// 				}
// 			]
// 		}
// 		diagnostics.push(diagnostic)
// 	}

// 	// Send the computed diagnostics to VSCode.
// 	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
// }

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event')
})

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(positionParams: TextDocumentPositionParams): CompletionItem[] => {
		const document = documents.get(positionParams.textDocument.uri)
		const text = document.getText().split(/\r?\n/g)
		const line = text[positionParams.position.line]
		connection.console.error('hai')
		return stepsHandler.getCompletion(line, positionParams.position)
	}
)

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		// Not sure what this is all about
		// if (item.data === 1) {
		// 	item.detail = 'MypeScript details'
		// 	item.documentation = 'MypeScript documentation'
		// } else if (item.data === 2) {
		// 	item.detail = 'JavaScript details'
		// 	item.documentation = 'JavaScript documentation'
		// }
		return item
	}
)

// Listen on the connection
connection.listen()
