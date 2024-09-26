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
	datasetPath = obtPastaTemporaria(session, dataset);
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

	console.log('lerFicheiroTxt');

	return fs.readFileSync(path.resolve(Ficheiro), { encoding: 'utf8', flag: 'r' })

	// return CopyZPic;
}


function obtPastaTemporaria(sessão = '', ficheiro = '') {

	const pastaTemp = vscode.workspace.getConfiguration().get('zowe.files.temporaryDownloadsFolder.path');
	const ficheiroTemp = pastaTemp + '/zSearch/' + sessão + '/' + ficheiro;
	console.log('ficheiro ' + ficheiroTemp);
	return ficheiroTemp;

}

function abrirFicheiro(sessao, Ficheiro) {

	const datasetPath = DownloadFicheiro(sessao, Ficheiro)

	const ficheiroHex = lerFicheiroHex(datasetPath);
	console.log('ficheiroHex ' + ficheiroHex);
	return ficheiroHex;



}

function trataFicheiro(sessao, Ficheiro, Copybook) {

	const ficheiro = abrirFicheiro(sessao, Ficheiro);

	const copybook = abreCopybook(sessao, Copybook);

	const dados = new dadosEcan(copybook, ficheiro);

}

class dadosEcan {
	constructor(CopyBook, Ficheiro) {


		const Conversor = new EBCDIC("0037");

		// Conversor.setTable('0037');

		// console.log('toASCII      - ' + Conversor.toASCII('F0F4F4C6'));
		// console.log('toEBCDIC     - ' + Conversor.toEBCDIC('044F'));

		this.Cabecalho = [];
		this.Linha = [];
		this.lrec = CopyBook.Tamanho;

		for (let i = 0; i < CopyBook.Copy.length; i++) {
			const element = CopyBook.Copy[i];
			if (element.Tipo != zPic.ValidaTipoCampo.Grupo) {
				this.Cabecalho.push(element.Variavel);
			}

		}
		// const Linha = Ficheiro.split(0, CopyBook.lrec);
		let Linha = [];
		let f = 0;

		while (f < Ficheiro.length) {
			Linha.push(Ficheiro.substring(f, f + CopyBook.Tamanho * 2));
			f += CopyBook.Tamanho * 2;
		}

		for (let i = 0; i < CopyBook.Copy.length; i++) {
			const element = CopyBook.Copy[i];


			console.log('----------------');
			const Alfa = Linha[0].substring((element.Inicio * 2) - 2, (element.Fim * 2));
			let Reg = [];
			console.log('Campo        ' + this.Cabecalho[i]);
			console.log('Alfa         ' + Alfa);
			console.log('AlfatoEBCDIC ' + Conversor.toEBCDIC(Alfa));


			switch (element.Tipo) {
				case zPic.ValidaTipoCampo.Alfanumerico:
				case zPic.ValidaTipoCampo.Display:
				case zPic.ValidaTipoCampo.National:
				case zPic.ValidaTipoCampo.Numerico:
				case zPic.ValidaTipoCampo.NumericoFormatado:
				case zPic.ValidaTipoCampo.NumericoSinal:

					const AlfaArray = Conversor.splitHex(Alfa);
					console.log('AlfaArray ' + AlfaArray);
					let Texto = '';
					AlfaArray.forEach(CarHex => {
						Texto += hextoEBCDIC(Conversor.toEBCDIC(CarHex));
					})
					Reg.push(Texto);
					console.log('Texto        ' + Texto);
					break;

				case zPic.ValidaTipoCampo.Comp3:
					// const Comp3Array =BigInt(Alfa);
					const Comp3 = Conversor.toEBCDIC(Alfa);
					console.log('Comp3        ' + Comp3);
					let Numero = Number(Comp3.substring(0, Alfa.length - 1));
					if (Comp3.slice(-1) == 'D') {
						Numero = -Numero;
					}
					Reg.push(Numero);
					console.log('Numero       ' + Numero);
					// const Comp3Array = Conversor.toASCII(Alfa);
					// console.log('Comp3Array - ' + Comp3Array);

					break;
				default:
					console.log(i + ' - ' + Alfa)
			}
		}
	}
}

function abreCopybook(sessao, ficheiro) {


	const datasetPath = DownloadFicheiro(sessao, ficheiro)

	const Copybook = lerFicheiroTxt(datasetPath)
	console.log('Copybook ' + Copybook);

	const CopyZPic = new zPic.Copybook(Copybook);
	console.log(CopyZPic.Copy);
	return CopyZPic;


}
async function SelecionarCopybook(sessao, Ficheiro) {


	const profInfo = new Imperative.ProfileInfo("zowe");
	await profInfo.readProfilesFromDisk();
	const zosmfProfAttrs = profInfo.getDefaultProfile("zosmf");

	let choices = vscode.workspace.getConfiguration().get('zFile.Copybooks.ListOfPreviousCopybooks');

	const novos = [
		{ label: 'Select copybook', kind: vscode.QuickPickItemKind.Separator },
		{ label: '$(device-desktop) Select Copybook from my Computer', },
		{ label: '$(remote) Select Copybook from ' + zosmfProfAttrs.profName }
	]
	const Separador = {
		label: 'Previous Copybooks',
		kind: vscode.QuickPickItemKind.Separator
	}

	return new Promise((resolve) => {
		const quickPick = vscode.window.createQuickPick();
		quickPick.items = novos;
		if (choices) {
			quickPick.items = quickPick.items.concat(Separador);
			quickPick.items = quickPick.items.concat(choices.map(choice => ({ label: '$(file-code)' + choice })));
		}
		quickPick.step = 1;
		quickPick.totalSteps = 2;
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
				trataFicheiro(sessao, Ficheiro, quickPick.value)
				quickPick.hide();

			}

		})

		quickPick.onDidChangeSelection(() => {
			console.log('onDidChangeSelection ' + quickPick.selectedItems[0].label);
			resolve(quickPick.selectedItems[0].label)
			trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(12))
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
	let quadro4 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '¢', '.', '<', '(', '+', '|']
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