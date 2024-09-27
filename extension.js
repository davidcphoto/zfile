// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const zowe_explorer_api = require('@zowe/zowe-explorer-api');
const Imperative = require("@zowe/imperative");
const zos_files = require("@zowe/zos-files-for-zowe-sdk");
const path = require('path');
const EBCDIC = require("ebcdic-ascii").default;
const zPic = require("./zPicClass.js");
const { match } = require('assert');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "zfile" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zfile.OpenFile', function (node = zowe_explorer_api.ZoweTreeNode) {
		// The code you place here will be executed every time your command is executed


		const Ficheiro = node.label;
		const sessao = node.mParent.session;


		// const asciiToEbcdicTable = Conversor.asciiToEbcdicTable;
		// const ebcdicToAsciiTable = Conversor.ebcdicToAsciiTable;
		// const a = parseInt('1234C', 16);
		// for (let i = 1; i < 17; i++) {
		// 	console.log('teste ' + i + ' - ' + parseInt('0034530C', i));
		// }

		// console.log('ficheiro ' + lerFicheiroHex("C:/Users/d.fonseca.do.canto/Documents/Projectos/zFile/zFile/test/X93182.K.AMB00237.AMCR0032"));

		SelecionarCopybook(sessao, Ficheiro);

	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}


function DownloadFicheiro(session, dataset) {

	console.log('DownloadFicheiro');

	let datasetPath = '';

	// (async () => {
	datasetPath = obtPastaTemporaria(dataset);
	const options = {
		"file": datasetPath
	};

	zos_files.Download.dataSet(session, dataset, options);
	return datasetPath;


	// })().catch((err) => {
	// 	console.error(err);
	// 	process.exit(1);

	// })
};

function lerFicheiroHex(Ficheiro) {

	console.log('lerFicheiroHex');

	const ficheiroHex = fs.readFileSync(path.resolve(Ficheiro), "hex")
	console.log('ficheiroHex ' + ficheiroHex);
	return ficheiroHex;

}

function lerFicheiroTxt(Ficheiro) {

	console.log('lerFicheiroTxt ' + Ficheiro);

	// const Resposta = fs.readFileSync(path.resolve(Ficheiro), { encoding: 'utf8', flag: 'r' })
	const Resposta = fs.readFileSync(Ficheiro, { encoding: 'utf8', flag: 'r' })

	if (!Resposta) {
		vscode.window.showErrorMessage('File ' +  + ' fot found');
	}
	return Resposta;
}


function obtPastaTemporaria(ficheiro = '') {

	const pastaTemp = vscode.workspace.getConfiguration().get('zowe.files.temporaryDownloadsFolder.path');
	const ficheiroTemp = pastaTemp + '/ZfILE/'  + ficheiro;
	console.log('ficheiro ' + ficheiroTemp);
	return ficheiroTemp;

}

function abrirFicheiro(sessao, Ficheiro) {

	const datasetPath = DownloadFicheiro(sessao, Ficheiro)

	const ficheiroHex = lerFicheiroHex(datasetPath);
	console.log('ficheiroHex ' + ficheiroHex);
	return ficheiroHex;



}

function trataFicheiro(sessao, Ficheiro, Copybook, central=new Boolean) {

	const ficheiro = abrirFicheiro(sessao, Ficheiro);

	let copybook;

	if (central) {
		copybook = abreCopybook(sessao, Copybook);
	} else {
		copybook = abreCopybook('', Copybook);
	}



	const dados = new dadosEcran(copybook, ficheiro);

	const html = formataHTML(Ficheiro, Copybook, dados);

	mostraFicheiro(html, Ficheiro);

}

class dadosEcran {
	constructor(CopyBook, Ficheiro) {

		const PageBreak = '0d0a';


		const Conversor = new EBCDIC("0037");

		this.Copybook = CopyBook;
		this.Ficheiro = Ficheiro;
		this.Cabecalho = [];
		this.dados = [];
		this.Linha = [];
		this.lrec = CopyBook.Tamanho;
		let Linha = [];

		Linha = Ficheiro.split(PageBreak);

		let Inicio = 0;
		let Fim = 0;


		for (let i = 0; i < (CopyBook.Copy.length); i++) {
			const element = CopyBook.Copy[i];

			if (element.Tipo != zPic.ValidaTipoCampo.Grupo) {
				this.Cabecalho.push(element.Variavel);
			}
		}

		for (let j = 0; j < (Linha.length - 1); j++) {
			let Reg = [];

			for (let i = 0; i < CopyBook.Copy.length; i++) {
				const element = CopyBook.Copy[i];

				if (element.Tipo != zPic.ValidaTipoCampo.Grupo) {

					if (Fim == 0) {
						Fim = element.Fim * 2;
					} else {
						Inicio = Fim;
						Fim += element.Tamanho * 2;
					}

					console.log('----------------');
					console.log('Campo        ' + element.Variavel);
					let Alfa = '';


					switch (element.Tipo) {
						case zPic.ValidaTipoCampo.Alfanumerico:
						case zPic.ValidaTipoCampo.Display:
						case zPic.ValidaTipoCampo.National:
						case zPic.ValidaTipoCampo.Numerico:
						case zPic.ValidaTipoCampo.NumericoFormatado:
						case zPic.ValidaTipoCampo.NumericoSinal:

							Alfa = Linha[j].substring(Inicio, Fim);
							console.log('Alfa         ' + Alfa);
							console.log('AlfatoEBCDIC ' + Conversor.toEBCDIC(Alfa));

							const AlfaArray = Conversor.splitHex(Alfa);
							console.log('AlfaArray ' + AlfaArray);
							let Texto = '';
							AlfaArray.forEach(CarHex => {
								Texto += hextoEBCDIC(Conversor.toEBCDIC(CarHex));
							})
							Reg.push(Texto);
							console.log('Texto        ' + Texto);
							break;

						case zPic.ValidaTipoCampo.Numerico:
						case zPic.ValidaTipoCampo.NumericoSinal:

							Alfa = Linha[j].substring(Inicio, Fim);
							console.log('Alfa         ' + Alfa);
							console.log('AlfatoEBCDIC ' + Conversor.toEBCDIC(Alfa));

							const Numerico = Conversor.splitHex(Alfa);
							console.log('Numerico ' + Numerico);
							let NumericoTexto = '';
							Numerico.forEach(CarHex => {
								NumericoTexto += hextoEBCDIC(Conversor.toEBCDIC(CarHex));
							})
							let numericoTratado = Number(NumericoTexto);

							if (element.decimais) {
								numericoTratado = numericoTratado / (10 ** element.decimais);

							}

							Reg.push(numericoTratado);
							console.log('numericoTratado ' + numericoTratado);
							break;

						case zPic.ValidaTipoCampo.Comp3:

							if (element.Tamanho > 4) {
								Fim = Inicio + 16;
							}
							Alfa = Linha[j].substring(Inicio, Fim);
							console.log('Alfa         ' + Alfa);
							console.log('AlfatoEBCDIC ' + Conversor.toEBCDIC(Alfa));


							const Comp3 = Conversor.toEBCDIC(Alfa);
							console.log('Comp3        ' + Comp3);
							let Numero = Number(Comp3.substring(0, Alfa.length - 1));
							if (Comp3.slice(-1) == 'D') {
								Numero = -Numero;
							}
							if (element.decimais) {
								Numero = Numero / (10 ** element.decimais);

							}
							Reg.push(Numero);
							console.log('Numero       ' + Numero);

							break;
						default:
							console.log(i + ' - ' + Alfa)
					}
				}
			}
			this.dados.push(Reg);
			Inicio = 0;
			Fim = 0;
		}
	}
}

function abreCopybook(sessao, ficheiro) {

	let datasetPath;

	if (sessao) {
		const Path = DownloadFicheiro(sessao, ficheiro)
		datasetPath = path.resolve(Path);
	} else {
		datasetPath = String(ficheiro);
	}


	const Copybook = lerFicheiroTxt(datasetPath)
	console.log('Copybook ' + Copybook);

	const CopyZPic = new zPic.Copybook(Copybook);
	console.log(CopyZPic.Copy);
	return CopyZPic;
}

async function SelecionarCopybook(sessao, Ficheiro) {


	const remoteIcon = '$(remote)';
	const desktopIcon = '$(device-desktop)';
	const profInfo = new Imperative.ProfileInfo("zowe");
	await profInfo.readProfilesFromDisk();
	const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");

	let choices = vscode.workspace.getConfiguration().get('zFile.Copybooks.ListOfPreviousCopybooks');
	let choicesPC = vscode.workspace.getConfiguration().get('zFile.Copybooks.ListOfPreviousWorksationCopybooks');

	const novos = [
		{ label: 'Select copybook', kind: vscode.QuickPickItemKind.Separator },
		{ label: 'Select Copybook from my Workstation '+desktopIcon},
		{ label: 'Select Copybook from ' + zosmfProfAttrs.profName + ' '+remoteIcon}
	]
	const Separador = {
		label: 'Previous Mainframe Copybooks',
		kind: vscode.QuickPickItemKind.Separator
	}


	const SeparadorPC = {
		label: 'Previous Workstation Copybooks',
		kind: vscode.QuickPickItemKind.Separator
	}

	return new Promise((resolve) => {

		const quickPick = vscode.window.createQuickPick();
		quickPick.items = novos;
		if (choices) {
			quickPick.items = quickPick.items.concat(Separador);
			quickPick.items = quickPick.items.concat(choices.map(choice => ({ label: remoteIcon + ' ' + choice })));
		}
		if (choicesPC) {
			quickPick.items = quickPick.items.concat(SeparadorPC);
			quickPick.items = quickPick.items.concat(choicesPC.map(choice => ({ label: desktopIcon + ' ' + choice })));
		}
		quickPick.value = "";
		quickPick.title = 'Select copybook';
		quickPick.placeholder = 'Copybook path';
		quickPick.canSelectMany = false;
		quickPick.ignoreFocusOut = true;


		quickPick.onDidChangeValue(() => {
			// INJECT user values into proposed values
		})

		quickPick.onDidAccept(() => {
			console.log('onDidAccept')
			if (quickPick.value) {
				if (!choices.includes(quickPick.value)) {

					choices.unshift(quickPick.value);
					const NumeroHistorico = vscode.workspace.getConfiguration().get('zFile.Copybooks.NumberOfPreviousCopybooks');

					while (NumeroHistorico < choices.length) {
						choices.pop();
					}
					vscode.workspace.getConfiguration().update('zFile.Copybooks.ListOfPreviousCopybooks', choices);

				}

				console.log('onDidAccept ' + quickPick.value);

				resolve(quickPick.value)
				trataFicheiro(sessao, Ficheiro, quickPick.value, true)
				quickPick.hide();

			}

		})

		quickPick.onDidChangeSelection(() => {
			console.log('onDidChangeSelection ' + quickPick.selectedItems[0].label);
			resolve(quickPick.selectedItems[0].label)
			console.log('quickPick.selectedItems[0].label ' + quickPick.selectedItems[0].label)
			switch (true) {
				case quickPick.selectedItems[0].label.endsWith(desktopIcon):

					const options = {
						canSelectMany: false,
						openLabel: 'Open',
						filters: {
							'Copybooks': ['cpy', 'cp'],
							'Text Files': ['txt'],
							'All files': ['*']
						}
					};

					vscode.window.showOpenDialog(options).then(fileUri => {
						if (fileUri && fileUri[0]) {
							console.log('fileUri[0].fsPath: ' + fileUri[0].fsPath);
							console.log('fileUri[0].path: ' + fileUri[0].path);

							if (!choicesPC.includes(fileUri[0].path.substring(1).split('/').join('\\'))) {

								choicesPC.unshift(fileUri[0].path.substring(1).split('/').join('\\'));
								const NumeroHistorico = vscode.workspace.getConfiguration().get('zFile.Copybooks.NumberOfPreviousCopybooks');

								while (NumeroHistorico < choicesPC.length) {
									choicesPC.pop();
								}
								vscode.workspace.getConfiguration().update('zFile.Copybooks.ListOfPreviousWorksationCopybooks', choicesPC);

							}
							trataFicheiro(sessao, Ficheiro, fileUri[0].fsPath, false)
						}
					});

					break;
				case quickPick.selectedItems[0].label.endsWith(remoteIcon):

					vscode.window.showInputBox({
						placeHolder: "HLQ.LIB.COPY(COPYBOOK)",
						value: "",
						title: "Copybook to read file",
		           }).then((value) => {

						if (!choices.includes(value)) {

							choices.unshift(value);
							const NumeroHistorico = vscode.workspace.getConfiguration().get('zFile.Copybooks.NumberOfPreviousCopybooks');

							while (NumeroHistorico < choices.length) {
								choices.pop();
							}
							vscode.workspace.getConfiguration().update('zFile.Copybooks.ListOfPreviousWorksationCopybooks', choices);

						}

						trataFicheiro(sessao, Ficheiro, value, true)

					});

					break;

				case quickPick.selectedItems[0].label.startsWith(desktopIcon):

					trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(desktopIcon.length).trim(), false)
					break;

				case quickPick.selectedItems[0].label.startsWith(remoteIcon):

					trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(remoteIcon.length+1), true)
					break;

			    // default:
				//     trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(12),true)
			}
			quickPick.hide();

		})



		quickPick.show();
	})

}


function hextoEBCDIC(hex) {

	// let quadro0 = ['NUL', 'SOH', 'STX', 'ETX', 'SEL', 'HT', 'RNL', 'DEL', 'GE', 'SPS', 'RPT', 'VT', 'FF', 'CR', 'SO', 'SI'];
	// let quadro1 = ['DLE', 'DC1', 'DC2', 'DC3', 'RES/ENP', 'NL', 'BS', 'POC', 'CAN', 'EM', 'UBS', 'CU1', 'IFS', 'IGS', 'IRS', 'IUS/ITB']
	// let quadro2 = ['DS', 'SOS', 'FS', 'WUS', 'BYP/INP', 'LF', 'ETB', 'ESC', 'SA', 'SFE', 'SM/SW', 'CSP', 'MFA', 'ENQ', 'ACK', 'BEL']
	// let quadro3 = ['', '', 'SYN', 'IR', 'PP', 'TRN', 'NBS', 'EOT', 'SBS', 'IT', 'RFF', 'CU3', 'DC4', 'NAK', '', 'SUB']
	// let quadro4 = ['SP', '', '', '', '', '', '', '', '', '', '¢', '.', '<', '(', '+', '|']
	// let quadro5 = ['&', '', '', '', '', '', '', '', '', '', '!', '$', '*', ')', ';', '¬']
	// let quadro6 = ['-', '/', '', '', '', '', '', '', '', '', '¦', ',', '%', '_', '>', '?']
	// let quadro7 = ['', '', '', '', '', '', '', '', '', '`', ':', '#', '@', "'", '=', '"']
	// let quadro8 = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '', '', '', '', '', '±']
	// let quadro9 = ['', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', '', '', '', '', '', '']
	// let quadro10 = ['', '~', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '', '', '', '', '', '']
	// let quadro11 = ['^', '', '', '', '', '', '', '', '', '', '[', ']', '', '', '', '']
	// let quadro12 = ['{', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', '', '', '', '', '', '']
	// let quadro13 = ['}', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', '', '', '', '', '', '']
	// let quadro14 = ['\\', '', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '', '', '', '', '', '']
	// let quadro15 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '', '', '', '', '', 'EO']

	let quadro0 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'];
	let quadro1 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
	let quadro2 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
	let quadro3 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
	let quadro4 = [' ', '.', '.', '.', '.', '.', '.', '.', '.', '.', '¢', '.', '<', '(', '+', '|']
	let quadro5 = ['&', '.', '.', '.', '.', '.', '.', '.', '.', '.', '!', '$', '*', ')', ';', '¬']
	let quadro6 = ['-', '/', '.', '.', '.', '.', '.', '.', '.', '.', '¦', ',', '%', '_', '>', '?']
	let quadro7 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '`', ':', '#', '@', "'", '=', '"']
	let quadro8 = ['.', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '.', '.', '.', '.', '.', '±']
	let quadro9 = ['.', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', '.', '.', '.', '.', '.', '.']
	let quadro10 = ['.', '~', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '.', '.', '.', '.', '.', '.']
	let quadro11 = ['^', '.', '.', '.', '.', '.', '.', '.', '.', '.', '[', ']', '.', '.', '.', '.']
	let quadro12 = ['{', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', '.', '.', '.', '.', '.', '.']
	let quadro13 = ['}', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', '.', '.', '.', '.', '.', '.']
	let quadro14 = ['\\', '.', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.', '.', '.', '.', '.', '.']
	let quadro15 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '.', '.', '.', '.', '.']
	let quadro = [quadro0, quadro1, quadro2, quadro3, quadro4, quadro5, quadro6, quadro7, quadro8,
		quadro9, quadro10, quadro11, quadro12, quadro13, quadro14, quadro15];

	const x = parseInt(hex.substring(0, 1), 16);
	const y = parseInt(hex.substring(1, 2), 16);

	return quadro[x][y];

}

function formataHTML(Ficheiro, Copybook, dados = new dadosEcran) {

	let Cabecalho='';

	for (let i = 0; i < dados.Cabecalho.length; i++) {
		const element = '<th>' + dados.Cabecalho[i] + '</th>';
		Cabecalho += element;
	}

	let Corpo = '';

	for (let i = 0; i < dados.dados.length; i++) {

		let Linha = '';

		for (let j = 0; j < dados.dados[i].length; j++) {
			const element = '<td>' + dados.dados[i][j] + '</td>';
			Linha += element;
		}

		const LinhaHTML = '<tr>' + Linha + '</tr>';
		Corpo += LinhaHTML;


	}

	const HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pic Calculator</title>

        <style>

            #cabecalho {
                display: block;
                position: relative;
                z-index: 5;
                padding: 8px;
                top: 0;
				left:0;
                text-align: center;
            }

			h3 {
                text-align: right;
			}

            #corpo {
                text-align: center;
                display: block;
				overflow: auto;
            }

			#total {
			    width:100%;
			}

            table {
                display: block;
                position: relative;
                overflow-x: auto;
                border-spacing: 5px;
                width: max-content;
            }

            th {
                padding: 8px;
            }

            tr {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }

            td {
                background-color: var(--vscode-list-hoverBackground);
                padding: 8px;
            }

        </style>
</head>

<body>
    <div id="total">
        <div id="cabecalho">
            <div>
                <h1>zFile</h1>
            </div>
        </div>
        <div id="corpo">
            <table>
                <tr>
	    		    ${Cabecalho}
                </tr>
                ${Corpo}
            </table>
        </div>
		<div>
            <h3>Copybook: ${Copybook}</h3>
		</div>
    </div>
</body>

</html>
`

return HTML;

}

function mostraFicheiro(html, Ficheiro) {

	let painel;
	painel = vscode.window.createWebviewPanel('zFile', Ficheiro,1);
	painel.webview.options = {
		enableScripts: true,

	};
	painel.webview.html = html;
	// painel.webview.onDidReceiveMessage(message => {
	// 	abreElemento(message);
	// })
}