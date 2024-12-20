// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const zowe_explorer_api = require('@zowe/zowe-explorer-api');
const Imperative = require("@zowe/imperative");
const zos_files = require("@zowe/zos-files-for-zowe-sdk");
const zPic = require("./zPicClass.js");
const ebcdic_parser = require("ebcdic-parser");
const { error } = require('console');
let nFicheiro = 0;


const quadro = [
	['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
	['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
	['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
	['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
	[' ', '.', '.', '.', '.', '.', '.', '.', '.', '.', '¢', '.', '<', '(', '+', '|'],
	['&', '.', '.', '.', '.', '.', '.', '.', '.', '.', '!', '$', '*', ')', ';', '¬'],
	['-', '/', '.', '.', '.', '.', '.', '.', '.', '.', '¦', ',', '%', '_', '>', '?'],
	['.', '.', '.', '.', '.', '.', '.', '.', '.', '`', ':', '#', '@', "'", '=', '"'],
	['.', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '.', '.', '.', '.', '.', '±'],
	['.', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', '.', '.', '.', '.', '.', '.'],
	['.', '~', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '.', '.', '.', '.', '.', '.'],
	['^', '.', '.', '.', '.', '.', '.', '.', '.', '.', '[', ']', '.', '.', '.', '.'],
	['{', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', '.', '.', '.', '.', '.', '.'],
	['}', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', '.', '.', '.', '.', '.', '.'],
	['\\', '.', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.', '.', '.', '.', '.', '.'],
	['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '.', '.', '.', '.', '.']
];


// let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {


	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "zfile" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('zfile.OpenFile', function (node = zowe_explorer_api.ZoweTreeNode) {
		// The code you place here will be executed every time your command is executed
		const Ficheiro = node.label;
		const sessao = node.mParent.session;

		if (sessao) {
			SelecionarCopybook(sessao, Ficheiro);

		} else {
			vscode.window.showErrorMessage('No Zowe Explorer active session')
		}
	});



	context.subscriptions.push(disposable);
	// context.subscriptions.push(disposableSave);


}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}


/////////////////////////////////////////////////////////////////////

function lerFicheiroTxt(Ficheiro) {


	// console.log('lerFicheiroTxt ' + Ficheiro);

	const copybook = fs.readFileSync(Ficheiro, { encoding: 'utf-8' })

	return copybook;

}


/////////////////////////////////////////////////////////////////////
async function abrirFicheiroBin(sessao, Ficheiro) {

	const FicheiroBinario = await zos_files.Get.dataSet(sessao, Ficheiro, { "binary": true }).catch(e => {
		vscode.window.showErrorMessage(e.mDetails.msg)
		// console.log(e)
	})
	// console.log('binario ' + FicheiroBinario)

	return FicheiroBinario;
}
/////////////////////////////////////////////////////////////////////

function enviaParaCentral(sessao, lista, Ficheiro = '') {

	vscode.window
		.showInformationMessage("Saving file will replace file '" + Ficheiro + "' on the server. Do you want to continue?", "Yes", "No")
		.then(answer => {
			if (answer === "Yes") {
				let listaBin = [];
				for (let i = 0; i < lista.length; i++) {
					listaBin.push(parseInt(lista[i], 16));
					// console.log(listaBin);
				}
				const ListaBuffer = Buffer.from(listaBin);

				zos_files.Upload.bufferToDataSet(sessao, ListaBuffer, Ficheiro, { 'binary': true }).then(ficheiro => {
					if (ficheiro.success) {
						vscode.window.showInformationMessage('File ' + Ficheiro + ' saved to server.')
					} else {
						vscode.window.showErrorMessage('Error saving file ' + Ficheiro + '.')
					}
				}).catch(e => {
					vscode.window.showErrorMessage('Error saving file ' + Ficheiro + '.')
					console.log(e);
				});
			} else {
				vscode.window.showInformationMessage("File '" + Ficheiro + "' not saved.");
			}
		})


}

/////////////////////////////////////////////////////////////////////
async function abrirFicheiroTXT(sessao, Ficheiro) {

	const FicheiroBinario = (await zos_files.Get.dataSet(sessao, Ficheiro)).toString();
	// console.log('record ' + FicheiroBinario)

	return FicheiroBinario;
}

/////////////////////////////////////////////////////////////////////
function trataFicheiro(sessao, Ficheiro, Copybook, central = new Boolean) {


	abrirFicheiroBin(sessao, Ficheiro).then(ficheiro => {

		if (central) {

			trataCopybook(sessao, Copybook).then(copybook => {

				trataDados(Ficheiro, Copybook, copybook, ficheiro, sessao)

			}).catch(err => {
				vscode.window.showErrorMessage(err)
			})

		} else {

			const copybook = lerFicheiroTxt(Copybook);

			const Copy = new zPic.Copybook(copybook);
			trataDados(Ficheiro, Copybook, Copy, ficheiro, sessao)

		}
	})

}

/////////////////////////////////////////////////////////////////////
function trataDados(NomeFicheiro, NomeCopybook, copybook, ficheiro, sessao) {

	const dados = new dadosEcran(copybook, ficheiro);

	if (dados.dados.length > 0) {

		const html = formataHTML(NomeFicheiro, NomeCopybook, dados);

		mostraFicheiro(sessao, NomeFicheiro, html, dados);

	}
}

/////////////////////////////////////////////////////////////////////
class dadosEcran {


	constructor(CopyBook = new zPic.Copybook, Ficheiro) {


		this.Copybook = CopyBook;
		this.Ficheiro = Ficheiro;
		this.Cabecalho = [];
		this.Tipo = [];
		this.Tamanho = [];
		this.Decimais = [];
		this.dados = [];
		this.lrec = CopyBook.Tamanho;
		let Inicio = 0;
		let Fim = 0;


		const NumeroRegistosMax = vscode.workspace.getConfiguration().get('zFile.NumberOfRecords');
		let NumeroRegistos = Ficheiro.length / CopyBook.Tamanho;
		const resto = Ficheiro.length % CopyBook.Tamanho;

		if (resto > 0) {
			vscode.window.showErrorMessage('Copybook seams to be invalid for the file size')
			error(1)
		} else {

			if (NumeroRegistosMax < NumeroRegistos) {
				NumeroRegistos = NumeroRegistosMax;
			}

			for (let i = 0; i < (CopyBook.Copy.length); i++) {
				const element = CopyBook.Copy[i];

				if (element.Tipo != zPic.ValidaTipoCampo.Grupo) {
					this.Cabecalho.push(element.Variavel);
					this.Tamanho.push(element.tamanhoBruto);
					this.Decimais.push(element.decimais);
					this.Tipo.push(element.Tipo);
				}
			}

			for (let j = 0; j < NumeroRegistos; j++) {
				let Reg = [];

				for (let i = 0; i < CopyBook.Copy.length; i++) {
					const element = CopyBook.Copy[i];

					if (element.Tipo != zPic.ValidaTipoCampo.Grupo) {

						if (Fim == 0) {
							Fim = element.Fim;
						} else {
							Inicio = Fim;
							Fim += element.Tamanho;
						}

						// console.log('----------------');
						// console.log('Campo        ' + element.Variavel);
						let Alfa = '';


						let AlfaArray = []
						let negativo = false;

						if (Ficheiro[Inicio] == 255) {
							negativo = true;
						}

						for (let K = Inicio; K < Fim; K++) {
							if (negativo) {
								if (K < Fim - 1) {
									AlfaArray.push((255 - Ficheiro[K]).toString(16));
								} else {
									AlfaArray.push((256 - Ficheiro[K]).toString(16));
								}
							} else {
								AlfaArray.push(Ficheiro[K].toString(16));
							}
						}
						// console.log('AlfaArray    ' + AlfaArray);

						switch (element.Tipo) {
							case zPic.ValidaTipoCampo.Alfanumerico:
							case zPic.ValidaTipoCampo.Display:
							case zPic.ValidaTipoCampo.National:
							case zPic.ValidaTipoCampo.NumericoFormatado:
							case zPic.ValidaTipoCampo.Numerico:

								// Trata Alfanumericos e numericos sem sinal
								// Converte os pares hexadecimais em hexadecimal do central e depois converte para caracteres

								let Texto = '';

								AlfaArray.forEach(CarHex => {
									Texto += hextoEBCDIC(CarHex);
								})
								Reg.push(Texto);
								// console.log('Texto        ' + Texto);
								break;

							case zPic.ValidaTipoCampo.NumericoSinal:

								// Trata numericos com sinal

								let NumeroSinal = '';

								AlfaArray.forEach(CarHex => {
									NumeroSinal += hextoEBCDIC(CarHex);
								})

								// Nota: O ebcdic_parser não trata corretamente as casas decimais e por defeito
								//       assume sempre 2 casas decimais por isso multiplico por 100 e valido as casas
								//       decimais depois
								const numericoTratado = ebcdic_parser.parse(NumeroSinal) * 100;

								const numericoTratadodecimais = acertaDecimais(numericoTratado, element.decimais);
								Reg.push(numericoTratadodecimais);

								// console.log('numericoTratadodecimais ' + numericoTratadodecimais);
								break;

							case zPic.ValidaTipoCampo.Comp3:

								// Trata numericos comp-3
								let AlfaCarHex2 = ''

								AlfaArray.forEach(CarHex => {
									if (CarHex.length == 1) {
										AlfaCarHex2 = CarHex;
										Alfa += '0' + AlfaCarHex2;
									} else {
										Alfa += CarHex;
									}
								})

								// console.log('Alfa         ' + Alfa);
								const CompTratado = converterNumerico(Alfa, element.decimais);


								Reg.push(CompTratado);
								// console.log('CompTratado ' + CompTratado);

								break;

							case zPic.ValidaTipoCampo.Binary:
							case zPic.ValidaTipoCampo.Comp:
							case zPic.ValidaTipoCampo.Comp2:
							case zPic.ValidaTipoCampo.Comp4:
							case zPic.ValidaTipoCampo.Comp5:

								let AlfaCarHex = ''

								AlfaArray.forEach(CarHex => {
									if (CarHex.length == 1) {
										AlfaCarHex = CarHex;
										Alfa += '0' + AlfaCarHex;
									} else {
										Alfa += CarHex;
									}
								})

								let numerico = parseInt(Alfa, 16);
								if (negativo) {
									numerico = -numerico;
								}
								numerico = acertaDecimais(numerico, element.decimais)
								// console.log('numero - ' + numerico)
								Reg.push(numerico);

								break

							default:
							// console.log(i + ' - ' + AlfaArray)
						}
					}
				}
				this.dados.push(Reg);
			}
		}

		/////////////////////////////////////////////////////////////////////
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

			// let quadro0 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'];
			// let quadro1 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
			// let quadro2 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
			// let quadro3 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']
			// let quadro4 = [' ', '.', '.', '.', '.', '.', '.', '.', '.', '.', '¢', '.', '<', '(', '+', '|']
			// let quadro5 = ['&', '.', '.', '.', '.', '.', '.', '.', '.', '.', '!', '$', '*', ')', ';', '¬']
			// let quadro6 = ['-', '/', '.', '.', '.', '.', '.', '.', '.', '.', '¦', ',', '%', '_', '>', '?']
			// let quadro7 = ['.', '.', '.', '.', '.', '.', '.', '.', '.', '`', ':', '#', '@', "'", '=', '"']
			// let quadro8 = ['.', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '.', '.', '.', '.', '.', '±']
			// let quadro9 = ['.', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', '.', '.', '.', '.', '.', '.']
			// let quadro10 = ['.', '~', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '.', '.', '.', '.', '.', '.']
			// let quadro11 = ['^', '.', '.', '.', '.', '.', '.', '.', '.', '.', '[', ']', '.', '.', '.', '.']
			// let quadro12 = ['{', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', '.', '.', '.', '.', '.', '.']
			// let quadro13 = ['}', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', '.', '.', '.', '.', '.', '.']
			// let quadro14 = ['\\', '.', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.', '.', '.', '.', '.', '.']
			// let quadro15 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '.', '.', '.', '.', '.']
			// let quadro = [quadro0, quadro1, quadro2, quadro3, quadro4, quadro5, quadro6, quadro7, quadro8,
			// 	quadro9, quadro10, quadro11, quadro12, quadro13, quadro14, quadro15];

			const x = parseInt(hex.substring(0, 1), 16);
			const y = parseInt(hex.substring(1, 2), 16);

			return quadro[x][y];

		}
	}

	/////////////////////////////////////////////////////////////////////
	//                atualizar a mensagem
	/////////////////////////////////////////////////////////////////////

	atulizarDados(dadosNovos) {

		// console.log(mensagem);


		const copy = this.Copybook.Copy;

		// for (let i = 0; i < copy.length; i++) {
		// 	const element = dados.Cabecalho[i];
		// 	// const vazio = '<td><input SelectLinha() value="" ></td>';
		// 	// LinhaVazia += vazio;
		// }

		let IndiceCampo = 0;
		let listaCaracteresTotal = [];

		for (let i = 0; i < dadosNovos.length; i++) {

			while (IndiceCampo < copy.length && copy[IndiceCampo].Tipo == zPic.ValidaTipoCampo.Grupo) {
				IndiceCampo++
			}

			if (IndiceCampo >= copy.length) {
				IndiceCampo = 0

				while (IndiceCampo < copy.length && copy[IndiceCampo].Tipo == zPic.ValidaTipoCampo.Grupo) {
					IndiceCampo++
				}
			}
			const campo = copy[IndiceCampo];

			IndiceCampo++;


			let ListaCaracter;
			let negativo = false;
			let NumeroSemSinal = '';

			// console.log('Campo:  ' + campo.Variavel);
			// console.log('Valor:  ' + dadosNovos[i]);

			switch (campo.Tipo) {
				case zPic.ValidaTipoCampo.Alfanumerico:
				case zPic.ValidaTipoCampo.Display:
				case zPic.ValidaTipoCampo.National:
				case zPic.ValidaTipoCampo.NumericoFormatado:

					const NumeroEspaços = campo.tamanhoBruto - dadosNovos[i].length;
					let espaços = '';

					for (let i = 0; i < NumeroEspaços; i++) {
						espaços += ' ';
					}

					ListaCaracter = ListarHexadecimais(dadosNovos[i] + espaços);
					break;

				case zPic.ValidaTipoCampo.Numerico:

					const numero = RetiraVirgula(dadosNovos[i], campo.tamanhoBruto, campo.decimais);
					// console.log('Numero: ' + numero);
					ListaCaracter = ListarHexadecimais(numero);
					break;

				case zPic.ValidaTipoCampo.NumericoSinal:

					if (Number(dadosNovos[i]) < 0) {
						negativo = true;
						const Valor = -Number(dadosNovos[i])
						NumeroSemSinal = String(Valor)
					} else {
						NumeroSemSinal = dadosNovos[i]
					}

					const numeroSinal = RetiraVirgula(NumeroSemSinal, campo.tamanhoBruto, campo.decimais);
					// console.log('Numero: ' + numeroSinal);
					ListaCaracter = ListarHexadecimais(numeroSinal);
					if (negativo) {
						ListaCaracter[ListaCaracter.length - 1] = ListaCaracter[ListaCaracter.length - 1].replace('f', 'd')
					} else {
						ListaCaracter[ListaCaracter.length - 1] = ListaCaracter[ListaCaracter.length - 1].replace('f', 'c')
					}
					break;

				case zPic.ValidaTipoCampo.Comp3:

					if (Number(dadosNovos[i]) < 0) {
						negativo = true;
						const Valor = -Number(dadosNovos[i])
						NumeroSemSinal = String(Valor)
					} else {
						NumeroSemSinal = dadosNovos[i]
					}

					let numeroComp3 = RetiraVirgula(NumeroSemSinal, campo.tamanhoBruto, campo.decimais);
					if (negativo) {
						numeroComp3 += 'd'
					} else {
						numeroComp3 += 'c'
					}
					if (numeroComp3.length < campo.Tamanho * 2) {
						numeroComp3 = '0' + numeroComp3
					}
					// console.log('numero: ' + numeroComp3);
					ListaCaracter = numeroComp3.match(/.{1,2}/g);
					break;

				case zPic.ValidaTipoCampo.Binary:
				case zPic.ValidaTipoCampo.Comp:
				case zPic.ValidaTipoCampo.Comp2:
				case zPic.ValidaTipoCampo.Comp4:
				case zPic.ValidaTipoCampo.Comp5:

					if (Number(dadosNovos[i]) < 0) {
						negativo = true;
						const Valor = -Number(dadosNovos[i])
						NumeroSemSinal = String(Valor)
					} else {
						NumeroSemSinal = dadosNovos[i]
					}

					let numeroComp = RetiraVirgula(NumeroSemSinal, campo.tamanhoBruto, campo.decimais);
					// if (negativo) {
					// 	numeroComp3 += 'd'
					// } else {
					// 	numeroComp3 += 'c'
					// }

					// console.log('numero: ' + numeroComp);
					const binario = Number(numeroComp).toString(16)
					// console.log('binario: ' + binario);
					const diferença = (campo.Tamanho * 2) - binario.length;
					let zeros = ''
					let FFs = ''

					for (let j = 0; j < diferença; j++) {
						zeros += '0';
						FFs += 'f';
					}

					const ListaCaracterTemp = zeros + binario

					if (negativo) {
						const ListaCaracterTemp = zeros + binario
						ListaCaracter = ListaCaracterTemp.match(/.{1,2}/g);
						let sinalPorTratar = true;
						for (let j = ListaCaracter.length - 1; j >= 0; j--) {
							let a = (15 - parseInt(ListaCaracter[j].substring(0, 1), 16)).toString(16);
							let b = (15 - parseInt(ListaCaracter[j].substring(1, 2), 16)).toString(16);

							// para valores negativos é necessario adicionar 1
							// se ja tiver o valor f (o ultimo digito em decimal) fica com o valor 0
							// e passa 1 para o digito seguinte
							if (sinalPorTratar) {
								if (b != 'f') {
									b = (parseInt(b, 16) + 1).toString(16);
									sinalPorTratar = false;
								} else {
									b = '0';
									if (a != 'f') {
										a = (parseInt(a,16) + 1).toString(16);
										sinalPorTratar = false;
									} else {
										a = '0';
									}
								}
							}
							ListaCaracter[j] = a + b;

						}
					} else {
						ListaCaracter = ListaCaracterTemp.match(/.{1,2}/g);
					}

					break;
			}

			console.log('Hex:    ' + ListaCaracter);
			if (ListaCaracter.length > 0) {
				listaCaracteresTotal = listaCaracteresTotal.concat(ListaCaracter);
			}
			// console.log('listaCaracteresTotal:    ' + listaCaracteresTotal);
		}
		return listaCaracteresTotal;

		function RetiraVirgula(numero = '', Tamanho = 0, Decimais = 0) {

			const numeroSepardo = numero.split('.');
			const TamanhoInteiro = Tamanho - Decimais;
			const diferençaInteiro = TamanhoInteiro - numeroSepardo[0].length
			let diferençaDecimais = 0;
			if (numeroSepardo.length > 1) {
				diferençaDecimais = Decimais - numeroSepardo[1].length;
			} else {
				diferençaDecimais = Decimais;
			}

			let TextoInteiro = '';

			for (let i = 0; i < diferençaInteiro; i++) {
				TextoInteiro += '0';
			}

			TextoInteiro += numeroSepardo[0];

			if (numeroSepardo.length > 1) {
				TextoInteiro += numeroSepardo[1];
			}
			for (let i = 0; i < diferençaDecimais; i++) {
				TextoInteiro += '0';
			}

			return TextoInteiro;
		}

		function ListarHexadecimais(Palavra) {

			let ListaCaracter = []
			for (let j = 0; j < Palavra.length; j++) {
				const caracter = Palavra[j];
				ListaCaracter.push(EBCDICtoHex(caracter));
			}

			return ListaCaracter;
		}

		function EBCDICtoHex(Caracter = '') {

			let x = 0;
			let y = 0;

			for (let i = 0; i < quadro.length; i++) {
				const linha = quadro[i];
				for (let j = 0; j < linha.length; j++) {
					if (linha[j] == Caracter) {
						x = i;
						y = j;
					}
				}
			}
			return x.toString(16) + y.toString(16);
		}
	}
}

/////////////////////////////////////////////////////////////////////
function converterNumerico(Comp_3 = '', decimais = 0) {

	let valor = Number(Comp_3.substring(0, Comp_3.length - 1));
	const Sinal = Comp_3.substring(Comp_3.length - 1);
	if (Sinal == 'D' || Sinal == 'd') {
		valor = -valor;
	}
	// valor = valor / (10 ** decimais);
	valor = acertaDecimais(valor, decimais);

	return valor;
}
/////////////////////////////////////////////////////////////////////
function acertaDecimais(Numero = 0, decimais = 0) {

	return Numero / (10 ** decimais);

}


/////////////////////////////////////////////////////////////////////
async function trataCopybook(sessao, datasetPath) {

	const copybook = await abrirFicheiroTXT(sessao, datasetPath)
	return new zPic.Copybook(copybook);
}

/////////////////////////////////////////////////////////////////////
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
		{ label: 'Select Copybook from my Workstation ' + desktopIcon },
		{ label: 'Select Copybook from ' + zosmfProfAttrs.profName + ' ' + remoteIcon }
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
			quickPick.items = quickPick.items.concat(choices.map(choice => ({ label: remoteIcon + ' ' + String(choice).match(/\((.*)\)/).pop(), description: choice })));
		}
		if (choicesPC) {
			quickPick.items = quickPick.items.concat(SeparadorPC);
			quickPick.items = quickPick.items.concat(choicesPC.map(choice => ({ label: desktopIcon + ' ' + String(choice).split('\\').pop().split('/').pop(), description: choice })));
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
			// console.log('onDidAccept')
			if (quickPick.value) {
				if (!choices.includes(quickPick.value)) {

					choices.unshift(quickPick.value);
					const NumeroHistorico = vscode.workspace.getConfiguration().get('zFile.Copybooks.NumberOfPreviousCopybooks');

					while (NumeroHistorico < choices.length) {
						choices.pop();
					}
					vscode.workspace.getConfiguration().update('zFile.Copybooks.ListOfPreviousCopybooks', choices);

				}

				// console.log('onDidAccept ' + quickPick.value);

				resolve(quickPick.value)
				trataFicheiro(sessao, Ficheiro, quickPick.value, true)
				quickPick.hide();

			}

		})

		quickPick.onDidChangeSelection(() => {
			// console.log('onDidChangeSelection ' + quickPick.selectedItems[0].label);
			resolve(quickPick.selectedItems[0].label)
			// console.log('quickPick.selectedItems[0].label ' + quickPick.selectedItems[0].label)
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
							// console.log('fileUri[0].fsPath: ' + fileUri[0].fsPath);
							// console.log('fileUri[0].path: ' + fileUri[0].path);

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

					// trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(desktopIcon.length).trim(), false)
					trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].description, false)
					break;

				case quickPick.selectedItems[0].label.startsWith(remoteIcon):

					// trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].label.substring(remoteIcon.length + 1), true)
					trataFicheiro(sessao, Ficheiro, quickPick.selectedItems[0].description, true)
					break;
			}
			quickPick.hide();

		})



		quickPick.show();
	})

}



/////////////////////////////////////////////////////////////////////
function formataHTML(Ficheiro, Copybook, dados = new dadosEcran) {

	let Cabecalho = '<th>#</th>';
	let NLinha = 1;
	let NColunas = 0;
	// let NColuna = 1;
	// const Save = '$(save)';

	let LinhaVazia = '<td class="numeros">NumeroSubstituir</td>';
	for (let i = 0; i < dados.Cabecalho.length; i++) {
		const element = '<th>' + dados.Cabecalho[i] + '</th>';
		Cabecalho += element;
		++NColunas;
		if (dados.Tipo[i] == zPic.ValidaTipoCampo.Alfanumerico ||
			dados.Tipo[i] == zPic.ValidaTipoCampo.Display ||
			dados.Tipo[i] == zPic.ValidaTipoCampo.National
		) {
			const vazio = `<td><input onclick="SelectLinha(NumeroSubstituir)" class="alfa" name="tabela" value="" maxlength="${dados.Tamanho[i]}"></td>`;
			LinhaVazia += vazio;
		} else {

			// let ValorTamanhoVazio = dados.Tamanho[i];
			const inteirodecimais = 10 ** dados.Decimais[i];
			const ValorMaximo = (10 ** dados.Tamanho[i] - 1) / inteirodecimais;
			const ValorDecimais = 1 / inteirodecimais;
			let ValorMinimo = 0;

			// if (ValorDecimais > 0) { ++ValorTamanhoVazio }


			if (dados.Tipo[i] == zPic.ValidaTipoCampo.Binary ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp1 ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp2 ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp3 ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp4 ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Comp5 ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.NumericoSinal ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.Numerico ||
				dados.Tipo[i] == zPic.ValidaTipoCampo.NumericoFormatado
			) {

				ValorMinimo = - ValorMaximo;

				const element = `<td><input onclick="SelectLinha(NumeroSubstituir)" class="number" type="number" name="tabela" value="0" max="${ValorMaximo}" min="${ValorMinimo}" step="${ValorDecimais}" let GuardarValor=0; onkeydown="GuardarValor=this.value" onkeyup="if(this.value > ${ValorMaximo} || this.value < ${ValorMinimo}) {this.value=GuardarValor;} if (Number(this.value)>Math.trunc(Number(this.value) * ${inteirodecimais})/${inteirodecimais}){this.value=Math.trunc(Number(this.value) * ${inteirodecimais})/${inteirodecimais};};"></td>`;
				LinhaVazia += element;
			}

		}
	}

	let Corpo = '';

	for (let i = 0; i < dados.dados.length; i++) {

		let Linha = `<td class="numeros">${NLinha}</td>`;

		for (let j = 0; j < dados.dados[i].length; j++) {

			let ValorTamanho = dados.Tamanho[j];

			if (dados.Tipo[j] == zPic.ValidaTipoCampo.Alfanumerico ||
				dados.Tipo[j] == zPic.ValidaTipoCampo.Display ||
				dados.Tipo[j] == zPic.ValidaTipoCampo.National
			) {
				const element = `<td><input onclick="SelectLinha(${NLinha})" class="alfa" name="tabela" value="` + String(dados.dados[i][j]).trim()
					+ `" maxlength="` + ValorTamanho
					+ `"></td>`;
				Linha += element;
			} else {

				const inteirodecimais = 10 ** dados.Decimais[j];
				const ValorMaximo = (10 ** dados.Tamanho[j] - 1) / inteirodecimais;
				const ValorDecimais = 1 / inteirodecimais;
				let ValorMinimo = 0;

				if (ValorDecimais > 0) { ++ValorTamanho }


				if (dados.Tipo[j] == zPic.ValidaTipoCampo.Binary ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp1 ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp2 ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp3 ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp4 ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Comp5 ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.NumericoSinal ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.Numerico ||
					dados.Tipo[j] == zPic.ValidaTipoCampo.NumericoFormatado
				) {
					ValorMinimo = - ValorMaximo;
					++ValorTamanho;
				}
				const element = `<td><input onclick="SelectLinha(${NLinha})" class="number" type="number" name="tabela" value="${dados.dados[i][j]}"
				max="${ValorMaximo}"
				min="${ValorMinimo}"
				step="${ValorDecimais}"
				let GuardarValor=0;
				onkeydown="GuardarValor=this.value"
					onkeyup="
					if(this.value > ${ValorMaximo} || this.value < ${ValorMinimo}) {
					    this.value=GuardarValor;
					}
                    if (Number(this.value)>Math.trunc(Number(this.value) * ${inteirodecimais})/${inteirodecimais}){
					    this.value=Math.trunc(Number(this.value) * ${inteirodecimais})/${inteirodecimais};
					};"></td>`;

				Linha += element;

			}
			// ++NColuna;
		}

		// NColuna = 1;
		const LinhaHTML = `<tr name="Linha" id="Linha${NLinha}">${Linha}</tr >`;
		++NLinha;
		Corpo += LinhaHTML;

	}

	const HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>zFile</title>

        <style>

		    body {
			    padding: 0;
			}
            .menu {
			    display:none;
			    background-color: var(--vscode-list-hoverBackground);
                box-shadow: 0px 8px 16px 0px rgba(255, 255, 255, 0.3);
			    padding: 5px;
				position: fixed;
			    top: 4em;
				z-index: 110;
				left: 0.5em;
			}

			.selecionado {
            	box-shadow: 0px 0px 0px 3px var(--vscode-editor-inactiveSelectionBackground);
			}

            .menuitem {
			    display:block;
                padding: 3px;
				margin: 3px;
			}

			.menuSeparador {
			    display:block;
                border-top: 1px solid #bbb;
                border-radius: 1px;
				margin: 3px;
			}
            .menuitem a, .menuitem a:active, .menuitem a:hover {
			    display:block;
		        cursor: pointer;
                color: var(--vscode-list-activeSelectionForeground);
                text-decoration: none;
			}
            .menuitem:hover {
                background-color: var(--vscode-list-activeSelectionBackground);
			}

            .alfa {
                text-align: left;
			}
		    .number {
                text-align: right;
			}

			#cabecalho {
                display: flex;
				position: fixed;
			    background-color: var(--vscode-textBlockQuote-background);
				width: 100%;
				z-index: 100;
				left: 0;
            }

			#colunamenu, #colunanome, #colunadados{
			    position: relative;
				display: block;
				padding: 8px;
				min-width: 50px;
				height: 5em;
			}

			#espaco {
				height: 6em;
				display: block;
			}

			.botoes {
                text-align: right;
				display: block;
                position: relative;

			}

            #corpo {
                text-align: center;
                display: contents;
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
                background-color: var(--vscode-list-activeSelectionBackground);
            }

            td, input {
                background-color: var(--vscode-list-hoverBackground);
				color: var(--vscode-list-activeSelectionForeground);
                text-align: center;
                padding: 3px;
				border: none;
				z-index:100;
            }

            tr:hover, input:hover {
                background-color: var(--vscode-list-activeSelectionBackground);
				border-color: var(--vscode-list-activeSelectionBackground);
            	box-shadow: 0px 0px 0px 3px var(--vscode-list-activeSelectionBackground);
            }

            .numeros {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }

			.button {

                background-color: var(--vscode-list-hoverBackground);
                transition: 0.3s transform ease-in-out, 0.3s opacity ease-in-out;
                cursor: pointer;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                width: 2em;
                height: 2em;
	            opacity: 1;
	            padding: 10px;
	            position: fixed;
	            top: 1.5em;
				z-index:100;

			    span{
                    width: 100vw;
                    height: 4px;
                    background-color: var(--vscode-list-activeSelectionForeground);
                    border-radius: 20%;
                }
            }

            .button:hover {
	    		box-shadow: 0px 8px 16px 0px rgba(255, 255, 255, 0.3);
			}

        </style>
		<script>

            let LinhaClicada=0;
			let NumeroLinhas = ${NLinha};
			let NColunas = ${NColunas};
	        const vscode = acquireVsCodeApi();

			function clicarmenu() {
				if (document.getElementById('menu').style.display != "block"){
				    document.getElementById('menu').style.display = "block"
				} else {
				    document.getElementById('menu').style.display = "none"
				};

			}

			function getDados(ficheiro) {

			    console.log(ficheiro);
			    const docFich = document.getElementById(ficheiro);
			    console.log(docFich);

				const tabela = document.getElementsByName("tabela");
                let retorno = [];
                for (let i = 0; i < tabela.length; i++) {
                  retorno.push(tabela[i].value);
                }
				const msgRetorno = '{"Salvar":' + JSON.stringify(retorno) + '}';
	            vscode.postMessage(msgRetorno);
				esconde();

			}

			function esconde() {
				document.getElementById('menu').style.display = "none";
			}

            function SelectLinha(Linha) {
			    if (Linha){
			        console.log('SelectLinha ' + Linha);
				    LinhaClicada = Linha;

				    for (let i = 0; i < document.getElementsByName('Linha').length; i++) {
				    	document.getElementsByName('Linha')[i].classList.remove("selecionado");
				    }

					document.getElementById('Linha' + Linha).classList.add("selecionado");
			    	esconde();
			    }
			}


			function NovaLinhaFim() {
			    console.log('NovaLinhaFim');

				for (let i = 0; i < document.getElementsByName('tabela').length; i++) {
					document.getElementsByName('tabela')[i].setAttribute('value',document.getElementsByName('tabela')[i].value);
				}
			    console.log('1 celula ' + document.getElementsByName('tabela')[0].getAttribute('value'));

			    // const tabelaTotal = document.getElementById("tabelaTotal");
			    const tabelaTotal = document.getElementsByTagName("tbody");
				console.log('NumeroLinhas ' + NumeroLinhas);

				const LinhaVazia = '${LinhaVazia}';
				const LinhaAtualizada = LinhaVazia.split("NumeroSubstituir").join(NumeroLinhas.toString());
				tabelaTotal[0].innerHTML+='<tr name="Linha" id="Linha' + NumeroLinhas + '">' + LinhaAtualizada + '</tr>';
				NumeroLinhas += 1;
				esconde();
			}

			function NovaLinhaInicio() {
			    const LinhasAntes = document.getElementsByName("tabela").length;
				console.log(LinhasAntes);
			    NovaLinhaFim();
			    const LinhasDepois = document.getElementsByName("tabela").length;
				console.log(LinhasDepois);
				const diferença = LinhasDepois-LinhasAntes;
				LinhaInicial=diferença;
				deslocaElementos(LinhaInicial, LinhasAntes, LinhasDepois);
				esconde();
				++LinhaClicada;
				SelectLinha(LinhaClicada);

			}

			function Exportar() {

				const tabela = document.getElementsByName("tabela");
                let retorno = [];
                for (let i = 0; i < tabela.length; i++) {
                  retorno.push(tabela[i].value);
                }
				const msgRetorno = '{"Exportar":' + JSON.stringify(retorno) + '}';
	            vscode.postMessage(msgRetorno);
				esconde();

			}

			function EliminarLinha() {
			    console.log('EliminarLinha');

			    console.log(LinhaClicada);
				--NumeroLinhas;
				const element = document.getElementById("Linha" + NumeroLinhas.toString());

				const Seguinte = LinhaClicada * NColunas;
				const Inicio = Seguinte - NColunas;
			    const Total = document.getElementsByName("tabela").length;

				deslocaInverso(Inicio,Seguinte,Total);
                element.remove();
				esconde();
			}

			function NovaLinhaDepois() {

			    const LinhasAntes = document.getElementsByName("tabela").length;
				console.log(LinhasAntes);
			    NovaLinhaFim();
			    const LinhasDepois = document.getElementsByName("tabela").length;
				console.log(LinhasDepois);
				const diferença = LinhasDepois-LinhasAntes;
				const LinhaInicial = (LinhaClicada + 1) * diferença;
				console.log(diferença);
				console.log(LinhaInicial);
				deslocaElementos(LinhaInicial, LinhasAntes, LinhasDepois);
				esconde();

			}


			function NovaLinhaAntes() {

			    const LinhasAntes = document.getElementsByName("tabela").length;
				console.log(LinhasAntes);
			    NovaLinhaFim();
			    const LinhasDepois = document.getElementsByName("tabela").length;
				console.log(LinhasDepois);
				const diferença = LinhasDepois-LinhasAntes;
				const LinhaInicial = LinhaClicada * diferença;
				deslocaElementos(LinhaInicial, LinhasAntes, LinhasDepois);
				esconde();
				++LinhaClicada;
				SelectLinha(LinhaClicada);

			}

	        function deslocaElementos(LinhaInicial, LinhasAntes, LinhasDepois) {
	        	let j = LinhasAntes - 1;

	        	for (let i = LinhasDepois - 1; i > LinhaInicial - 1; i--) {
	        		console.log('trata ' + i + ' - ' + j);
	        		console.log('Move ' + document.getElementsByName("tabela")[j].value);
	        		// document.getElementsByName("tabela")[i].setAttribute("value", document.getElementsByName("tabela")[j].getAttribute("value"));
	        		document.getElementsByName("tabela")[i].value = document.getElementsByName("tabela")[j].value;

	        		if (document.getElementsByName("tabela")[j].type == "number") {
	        			document.getElementsByName("tabela")[j].setAttribute("value", "0");
	        		} else {
	        			document.getElementsByName("tabela")[j].setAttribute("value", "");
	        		}

	        		--j;

	        	}


	        }


	        function deslocaInverso(Inicial, Seguinte, Total) {

			    console.log('Inicio ' + Inicial);
			    console.log('Seguinte ' + Seguinte);
			    console.log('Total ' + Total);
			    let j=Seguinte;

	        	for (let i = Inicial; i < Total - NColunas; i++) {
			    console.log('i ' + i);
			    console.log('j ' + j);

				    document.getElementsByName("tabela")[i].value = document.getElementsByName("tabela")[j].value;
                    document.getElementsByName("tabela")[j].value = '';
	        		++j;

	        	}


	        }

			window.addEventListener('message', event => {

                const message = event.data; // The JSON data our extension sent
				console.log('Ficheiro ' + message.ficheiro);

                switch (message.command) {
                    case 'Salvar':
                        getDados(message.ficheiro);
                        break;
                    case 'Exportar':
                        Exportar(message.ficheiro);
                        break;
					case 'NovaLinhaFim':
						NovaLinhaFim(message.ficheiro);
						break;
					case 'NovaLinhaInicio':
						NovaLinhaInicio(message.ficheiro);
						break;
					case 'EliminarLinha':
						EliminarLinha(message.ficheiro);
						break;
					case 'NovaLinhaDepois':
						NovaLinhaDepois(message.ficheiro);
						break;
				    case 'NovaLinhaAntes':
						NovaLinhaAntes(message.ficheiro);
						break;
                }
            });

			// window.addEventListener("click", (event) => {
            //     esconde();
            // });


			// window.addEventListener("contextmenu", (event) => {
            //     console.log(event.offsetX, event.offsetY);
            //     esconde();
            // });

		</script>
</head>

<body id="zFile${nFicheiro}" data-vscode-context='{"Ficheiro": "zFile${nFicheiro}", "preventDefaultContextmenuitems": true}'>
    <div id="total">
        <div id="cabecalho">
		    <div id="colunamenu">
		        <div class="button" onclick="clicarmenu()">
	            	<span> </span>
	            	<span> </span>
	            	<span> </span>
	            </div>
	        </div>
			<div id="colunanome">
			    <h1>Zpic</h1>
			</div>
            <div id=colunadados>
                <p>File: ${Ficheiro}</p>
                <p>Copybook: ${Copybook}</p>
	        </div>
		</div>
		<div id="espaco">
		</div>
        <div id="corpo">
            <table id="tabelaTotal">
                <tr>
	    		    ${Cabecalho}
                </tr>
                ${Corpo}
            </table>
        </div>
    </div>
	<div>

	    <ul id="menu" class="menu">
            <li class="menuitem"><a onclick="getDados()">Save</a></li>
            <li class="menuitem"><a onclick="Exportar()">Export to CSV</a></li>
            <li class="menuSeparador"></li>
            <li class="menuitem"><a onclick="NovaLinhaInicio()">Add new line to the beginning</a></li>
            <li class="menuitem"><a onclick="NovaLinhaAntes()">Add new line before this</a></li>
            <li class="menuitem"><a onclick="NovaLinhaDepois()">Add new line after this</a></li>
            <li class="menuitem"><a onclick="NovaLinhaFim()">Add new line to the end</a></li>
            <li class="menuitem"><a onclick="EliminarLinha()">Remove Line</a></li>
	    </ul>
    </div>
</body>

</html>
`
	++nFicheiro;
	return HTML;

}

/////////////////////////////////////////////////////////////////////
function mostraFicheiro(sessao, NomeFicheiro, html, dados = new dadosEcran) {

	let painel;
	painel = vscode.window.createWebviewPanel('zFile', NomeFicheiro, 1, {
		enableScripts: true,
		retainContextWhenHidden: true,
		enableFindWidget: true,
		enableCommandUris: true,

	});

	// painel.onDidChangeViewState((state) => {
	// 	console.log('onDidChangeViewState ' + state.webviewPanel.title);
	// 	painel = state.webviewPanel;
	// });
	painel.onDidDispose(() => {
		painel.dispose();
	});
	painel.webview.html = html;
	painel.webview.onDidReceiveMessage(mensagem => {

		const dadosMensagem = JSON.parse(mensagem);
		const Salvar = dadosMensagem.Salvar;
		const Exportar = dadosMensagem.Exportar;

		switch (true) {
			case Salvar != undefined:
				const dadosNovos = dadosMensagem.Salvar;
				const lista = dados.atulizarDados(dadosNovos);
				enviaParaCentral(sessao, lista, NomeFicheiro);
				break;
			case Exportar != undefined:
				vscode.window.showSaveDialog({ filters: { csv: ["csv"] }, title: "Export" }).then(result => {

					const CSV = formataCSV(Exportar, dados.Cabecalho.length);
					vscode.workspace.fs.writeFile(result, new TextEncoder().encode(CSV));
				});
				break;

		}
	})

	/////////////////////////////////////////////////////////////////////
	function formataCSV(dados = [], tamanho = 0) {

		let dadoscsv = '';
		let contador = 0;

		for (let i = 0; i < dados.length; i++) {
			dadoscsv += dados[i];
			dadoscsv += ';';
			++contador;
			if (contador == tamanho) {
				dadoscsv += '\n';
				contador = 0;
			}

		}

		return dadoscsv;

	}

	/////////////////////////////////////////////////////////////////////
	let disposableSave = vscode.commands.registerCommand('zfile.Save', function (click) {

		console.log(click);
		if (painel) {
			painel.webview.postMessage({ command: 'Salvar', ficheiro: click.Ficheiro });
		}


	});

	// /////////////////////////////////////////////////////////////////////
	// let disposableExport = vscode.commands.registerCommand('zfile.Export', function () {

	// 	if (painel) {
	// 		painel.webview.postMessage({ command: 'Exportar' });
	// 	}

	// });

	///////////////////////////////////////////////////////////////////
	let disposableAddLineAfter = vscode.commands.registerCommand('zfile.AddLineAfter', function (click) {

		console.log(click);
		if (painel) {
			painel.webview.postMessage({ command: 'NovaLinhaDepois', ficheiro: click.Ficheiro });
		}

	});

	// /////////////////////////////////////////////////////////////////////
	// let disposableAddLineBefore = vscode.commands.registerCommand('zfile.AddLineBefore', function () {

	// 	if (painel) {
	// 		painel.webview.postMessage({ command: 'NovaLinhaAntes' });
	// 	}

	// });

	// /////////////////////////////////////////////////////////////////////
	// let disposableAddLineBeginning = vscode.commands.registerCommand('zfile.AddLineBeginning', function () {

	// 	if (painel) {
	// 		painel.webview.postMessage({ command: 'NovaLinhaInicio' });
	// 	}

	// });

	// /////////////////////////////////////////////////////////////////////
	// let disposableAddLineEnd = vscode.commands.registerCommand('zfile.AddLineEnd', function () {

	// 	if (painel) {
	// 		painel.webview.postMessage({ command: 'NovaLinhaFim' });
	// 	}

	// });
	// /////////////////////////////////////////////////////////////////////
	// let disposableRemoveLine = vscode.commands.registerCommand('zfile.RemoveLine', function () {
	// 	vscode.window.showInformationMessage("EliminarLinha");
	// 	if (painel) {
	// 		painel.webview.postMessage({ command: 'EliminarLinha' });
	// 	}
	// });

	this.context.subscriptions.push(disposableSave);
	this.context.subscriptions.push(disposableAddLineAfter);
	// this.context.subscriptions.push(disposableAddLineBefore);
	// this.context.subscriptions.push(disposableAddLineBeginning);
	// this.context.subscriptions.push(disposableAddLineEnd);
	// this.context.subscriptions.push(disposableRemoveLine);
	// this.context.subscriptions.push(disposableExport);

}
