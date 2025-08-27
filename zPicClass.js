


exports.Copybook = class {
    constructor(Ficheiro = new String) {

        const fichTemp = removeSeqnumAste(Ficheiro);
        const FicheiroLinhas = fichTemp.split('.');
        let copy = [];
        let inicio = 1
        let inicioBruto = 1;

        for (let i = 0; i < FicheiroLinhas.length - 1; ++i) {
            const linha = new Linha(FicheiroLinhas[i].trim(), inicio, inicioBruto);
            inicio += linha.TamanhoIndividual;
            inicioBruto += linha.tamanhoBruto;
            copy.push(linha)
        }

        const tempCopy = AcumulaGrupos(copy, -1);
        this.Copy = tempCopy;
        this.Tamanho = obtemTotal(tempCopy);
    }
}


function removeSeqnumAste(fullText) {

    let fullTextArray = fullText.split(/\r?\n|\r|\n/g);

    let resultado = '';

    for (let i = 0; i < fullTextArray.length; ++i) {


        if (fullTextArray[i].trim().length > 6) {

            if (fullTextArray[i].substring(6, 7) != '*' && fullTextArray[i].substring(7, 72).trim().length > 0) {

                resultado = resultado + fullTextArray[i].substring(7, 72);

            }
        }
    }
    return resultado;
}


class Linha {
    constructor(Linha, inicio, inicioBruto) {

        const posNivel = 0;
        let posVariavel = 1;
        let posPic = 0;
        let posTipo = 0;
        let posValor = 0;
        let posTemDecimais = 0;
        let posDecimais = 0;
        this.decimais = 0;

        const linha = Linha.toUpperCase();
        this.Redefines = linha.includes("REDEFINES");
        let linhaSeparada = linha.split(/[\s()]+/);

        this.Nivel = Number(linhaSeparada[posNivel]);

        for (let i = 0; i < linhaSeparada.length; ++i) {
            if (linhaSeparada[i] == "PIC") {
                posPic = i;
                posTipo = posPic + 1;
                posValor = posPic + 2;
                posTemDecimais = posPic + 3;
                posDecimais = posPic + 4;
            }
        }

        if (linhaSeparada[posVariavel] == "OCCURS" || linhaSeparada[posVariavel] == "REDEFINES" || linhaSeparada[posVariavel] == "PIC") {

            this.Variavel = "n/a";

        } else {

            this.Variavel = linhaSeparada[posVariavel];

        }

        if (posValor == 0) {
            this.tamanhoBruto = 0;
        } else {
            this.tamanhoBruto = Number(linhaSeparada[posValor]);
        }

        if (linhaSeparada.length > posTemDecimais) {

            if (linhaSeparada[posTemDecimais] == "V9") {
                this.tamanhoBruto += Number(linhaSeparada[posDecimais]);
                this.decimais = Number(linhaSeparada[posDecimais]);
            } else {
                if (linhaSeparada[posTemDecimais].startsWith("V9")) {
                    this.tamanhoBruto += linhaSeparada[posTemDecimais].length - 1;
                    this.decimais = linhaSeparada[posTemDecimais].length - 1;
                }
            }
        }

        if (linha.includes('PIC')) {
            switch (linhaSeparada[posTipo]) {
                case 'X':
                case 'A':
                    this.Tipo = TipoCampo.Alfanumerico;
                    break;
                case '9':
                case 'S9':
                    this.Tipo = validaNumericos(linha);
                    break;
                default:
                    this.Tipo = TipoCampo.NumericoFormatado;
                    break;

            }

        } else {
            if (linhaSeparada[posNivel] == '88') {
                this.Tipo = TipoCampo.Switch;
            } else {
                this.Tipo = TipoCampo.Grupo;
            }
        }

        switch (this.Tipo) {
            case TipoCampo.Alfanumerico:
            case TipoCampo.Numerico:
            case TipoCampo.NumericoSinal:

                this.TamanhoIndividual = this.tamanhoBruto;
                break;

            case TipoCampo.Comp:
            case TipoCampo.Comp1:
            case TipoCampo.Comp2:
            case TipoCampo.Comp3:
            case TipoCampo.Comp4:
            case TipoCampo.Comp5:
            case TipoCampo.Binary:

                this.TamanhoIndividual = CalculoTamanho(this.tamanhoBruto, this.Tipo)

                break;


            case TipoCampo.Display:
            case TipoCampo.National:
            case TipoCampo.NumericoFormatado:

                this.TamanhoIndividual = String(linhaSeparada[posValor-1]).length;
                this.tamanhoBruto = String(linhaSeparada[posValor-1]).length;

                break;


            case TipoCampo.Grupo:
            case TipoCampo.Switch:
                this.TamanhoIndividual = 0;
                break;
        }

        if (linha.includes('OCCURS')) {
            for (let i = 0; i < linhaSeparada.length; ++i) {
                if (linhaSeparada[i] == 'OCCURS') {
                    this.Occurs = Number(linhaSeparada[i + 1]);
                    this.Tamanho = this.TamanhoIndividual * this.Occurs;
                }
            }

        } else {
            this.Occurs = 1;
            this.Tamanho = this.TamanhoIndividual;
        }

        if (linha.includes('REDEFINES')) {
            this.Redefines = true;
        }

        this.Inicio = inicio;
        this.InicioBruto = inicioBruto;

        this.Fim = this.Inicio + this.Tamanho - 1;
        this.FimBruto = this.InicioBruto + this.tamanhoBruto - 1;
    }
}

function CalculoTamanho(Valor, Tipo) {

    let tamanho = 0;
    switch (Tipo) {
        case TipoCampo.Comp:
        case TipoCampo.Comp4:
        case TipoCampo.Comp5:
        case TipoCampo.Binary:
            if (Valor <= 4) {
                tamanho = 2;
            } else {
                if (Valor <= 9) {
                    tamanho = 4;
                } else {
                    tamanho = 8;
                }
            }
            break;
        case TipoCampo.Comp1:
            tamanho = 4;
            break
        case TipoCampo.Comp2:
            tamanho = 8;
            break;
        case TipoCampo.Comp3:
            tamanho = Math.round((Valor + 1) / 2);
            break;
    }

    return tamanho;
}

function validaNumericos(Linha = new String) {

    let resultado;
    switch (true) {
        case Linha.includes(' COMP-1'):
            resultado = TipoCampo.Comp1;
            break;
        case Linha.includes(' COMP-2'):
            resultado = TipoCampo.Comp2;
            break;
        case Linha.includes(' COMP-3'):
            resultado = TipoCampo.Comp3;
            break;
        case Linha.includes(' COMP-4'):
            resultado = TipoCampo.Comp4;
            break;
        case Linha.includes(' COMP-5'):
            resultado = TipoCampo.Comp5;
            break;
        case Linha.includes(' COMP'):
            resultado = TipoCampo.Comp;
            break;
        case Linha.includes(' DISPLAY'):
            resultado = TipoCampo.Display;
            break;
        case Linha.includes(' NATIONAL'):
            resultado = TipoCampo.National;
            break;
        case Linha.includes(' BINARY'):
            resultado = TipoCampo.Binary;
            break;
        case Linha.includes(' S9('):
            resultado = TipoCampo.NumericoSinal;
            break;
        default:
            resultado = TipoCampo.Numerico;
            break;
    }

    return resultado;
}
const TipoCampo = {
    Alfanumerico: 0,
    Numerico: 1,
    NumericoSinal: 2,
    Comp: 3,
    Comp1: 4,
    Comp2: 5,
    Comp3: 6,
    Comp4: 7,
    Comp5: 8,
    Display: 9,
    National: 10,
    Binary: 11,
    NumericoFormatado: 12,
    Grupo: 13,
    Switch: 14
}

exports.ValidaTipoCampo = {
    Alfanumerico: 0,
    Numerico: 1,
    NumericoSinal: 2,
    Comp: 3,
    Comp1: 4,
    Comp2: 5,
    Comp3: 6,
    Comp4: 7,
    Comp5: 8,
    Display: 9,
    National: 10,
    Binary: 11,
    NumericoFormatado: 12,
    Grupo: 13,
    Switch: 14
}


function obtemTotal(copy) {

    let Total = copy[0].Tamanho;
    let nivelInicial = copy[0].Nivel;

    for (let i = 1; i < copy.length; ++i) {
        if (copy[i].Nivel == nivelInicial) {
            Total += copy[i].Tamanho;
        }
    }

    return Total;
}

function AcumulaGrupos(copy, indice) {

    let total = 0;

    for (let i = indice + 1; i < copy.length && copy[i].Nivel >= copy[indice + 1].Nivel; ++i) {

        if (copy[i].Tipo == TipoCampo.Grupo) {

            copy = AcumulaGrupos(copy, i)

            if (!copy[i].Redefines) {
                total += copy[i].Tamanho;
            }

            let Posição = 0;

            for (let j = i + 1; j < copy.length && copy[i].Nivel < copy[j].Nivel; ++j) {
                Posição = j;
            }
            i = Posição;

        } else {

            if (!copy[i].Redefines) {
                total += copy[i].Tamanho;
            }

        }


    }

    if (indice >= 0) {

        copy[indice].TamanhoIndividual = total;
        copy[indice].Tamanho = copy[indice].TamanhoIndividual * copy[indice].Occurs;
    }
    return copy;

}